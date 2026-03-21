import { prisma } from '../prisma';
import { formatZambianPhone } from '../utils';
import { addPaymentJob } from '../queues/payments.queue';
import { generateBookingReference } from '../utils';
import { type USSDSession, setSession } from './session';

type PaymentProvider = 'AIRTEL_MONEY' | 'MTN_MOMO' | 'ZAMTEL_KWACHA';

const ZAMBIAN_CITIES = [
  'Lusaka',
  'Kitwe',
  'Ndola',
  'Livingstone',
  'Chipata',
  'Kasama',
  'Solwezi',
  'Kabwe',
  'Mansa',
  'Mongu',
];

function buildCityMenu(exclude?: string): string {
  let menu = '';
  let idx = 1;
  for (const city of ZAMBIAN_CITIES) {
    if (city !== exclude) {
      menu += `${idx}. ${city}\n`;
      idx++;
    }
  }
  return menu.trimEnd();
}

function getCityByIndex(index: number, exclude?: string): string | null {
  const filtered = exclude ? ZAMBIAN_CITIES.filter((c) => c !== exclude) : ZAMBIAN_CITIES;
  return filtered[index - 1] ?? null;
}

export async function handle(
  inputs: string[],
  session: USSDSession,
  sessionId: string
): Promise<string> {
  const step = session.step;

  // Step 1: Select departure city
  if (step === 0) {
    session.step = 1;
    session.currentMenu = 'booking';
    await setSession(sessionId, session);

    return `CON Select departure city:\n${buildCityMenu()}`;
  }

  // Step 2: Process departure city, show destination cities
  if (step === 1) {
    const input = parseInt(inputs[inputs.length - 1], 10);
    const city = getCityByIndex(input);

    if (!city) {
      return 'END Invalid selection. Please try again.';
    }

    session.data.fromCity = city;
    session.step = 2;
    await setSession(sessionId, session);

    return `CON From: ${city}\nSelect destination:\n${buildCityMenu(city)}`;
  }

  // Step 3: Process destination, show available journeys
  if (step === 2) {
    const input = parseInt(inputs[inputs.length - 1], 10);
    const city = getCityByIndex(input, session.data.fromCity);

    if (!city) {
      return 'END Invalid selection. Please try again.';
    }

    session.data.toCity = city;
    session.step = 3;

    const journeys = await prisma.journey.findMany({
      where: {
        route: {
          fromCity: session.data.fromCity,
          toCity: city,
          isActive: true,
        },
        status: 'SCHEDULED',
        availableSeats: { gt: 0 },
        departureTime: { gte: new Date() },
      },
      include: {
        operator: { select: { name: true } },
        route: { select: { fromCity: true, toCity: true } },
      },
      orderBy: { departureTime: 'asc' },
      take: 5,
    });

    if (journeys.length === 0) {
      return `END No buses available from ${session.data.fromCity} to ${city}. Please try later.`;
    }

    let menu = `CON ${session.data.fromCity} -> ${city}\nAvailable buses:\n`;

    const journeyIds: string[] = [];
    for (let i = 0; i < journeys.length; i++) {
      const j = journeys[i];
      const time = j.departureTime.toLocaleTimeString('en-ZM', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      menu += `${i + 1}. ${j.operator.name} ${time} K${j.price} (${j.availableSeats} seats)\n`;
      journeyIds.push(j.id);
    }

    session.data.journeyIds = JSON.stringify(journeyIds);
    await setSession(sessionId, session);

    return menu.trimEnd();
  }

  // Step 4: Process journey selection, show payment methods
  if (step === 3) {
    const input = parseInt(inputs[inputs.length - 1], 10);
    const journeyIds: string[] = JSON.parse(session.data.journeyIds ?? '[]');
    const selectedId = journeyIds[input - 1];

    if (!selectedId) {
      return 'END Invalid selection. Please try again.';
    }

    const journey = await prisma.journey.findUnique({
      where: { id: selectedId },
      include: {
        operator: { select: { name: true } },
        route: { select: { fromCity: true, toCity: true } },
      },
    });

    if (!journey || journey.availableSeats <= 0) {
      return 'END Sorry, this journey is no longer available.';
    }

    session.data.journeyId = selectedId;
    session.data.price = journey.price.toString();
    session.data.operatorName = journey.operator.name;
    session.step = 4;
    await setSession(sessionId, session);

    return `CON ${journey.operator.name}\n${session.data.fromCity} -> ${session.data.toCity}\nFare: K${journey.price}\n\nSelect payment method:\n1. Airtel Money\n2. MTN MoMo\n3. Zamtel Kwacha`;
  }

  // Step 5: Confirm and process payment
  if (step === 4) {
    const input = parseInt(inputs[inputs.length - 1], 10);

    const paymentMethods: Record<number, PaymentProvider> = {
      1: 'AIRTEL_MONEY',
      2: 'MTN_MOMO',
      3: 'ZAMTEL_KWACHA',
    };

    const method = paymentMethods[input];
    if (!method) {
      return 'END Invalid payment method. Please try again.';
    }

    const phone = formatZambianPhone(session.phoneNumber);
    const reference = generateBookingReference();
    const price = parseFloat(session.data.price);

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone,
          name: 'USSD User',
          passwordHash: '',
          role: 'PASSENGER',
        },
      });
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        journeyId: session.data.journeyId,
        userId: user.id,
        reference,
        paymentMethod:
          method === 'AIRTEL_MONEY'
            ? 'AIRTEL_MONEY'
            : method === 'MTN_MOMO'
              ? 'MTN_MOMO'
              : 'ZAMTEL_KWACHA',
        paymentStatus: 'PENDING',
        status: 'PENDING',
        price,
        bookedVia: 'USSD',
        passengerPhone: phone,
        passengerName: user.name,
      },
    });

    // Queue payment processing
    await addPaymentJob({
      bookingId: booking.id,
      method,
      phone,
      amount: price,
      reference,
    });

    return `END Booking confirmed!\nRef: ${reference}\n${session.data.fromCity} -> ${session.data.toCity}\nFare: K${price.toFixed(2)}\n\nA payment prompt will be sent to your phone. Approve to complete booking.`;
  }

  return 'END An error occurred. Please try again.';
}
