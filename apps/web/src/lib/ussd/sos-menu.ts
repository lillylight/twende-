import { prisma } from '../prisma';
import { formatZambianPhone, formatCurrency } from '../utils';
import { reverseGeocode } from '../geocoding';
import { addSMSJob } from '../queues/sms.queue';

const EMERGENCY_PHONE = process.env.EMERGENCY_PHONE ?? '+260211999999';
const RTSA_PHONE = process.env.RTSA_ALERT_PHONE ?? '+260211234567';
const POLICE_PHONE = process.env.POLICE_PHONE ?? '+260211911111';

export async function handle(phoneNumber: string, sessionId: string): Promise<string> {
  const phone = formatZambianPhone(phoneNumber);

  // Find the user's active booking/journey
  const user = await prisma.user.findUnique({
    where: { phone },
  });

  // Find any active journey the user is on
  const activeBooking = await prisma.booking.findFirst({
    where: {
      passengerPhone: phone,
      status: { in: ['CONFIRMED', 'CHECKED_IN'] },
      journey: {
        status: { in: ['BOARDING', 'EN_ROUTE'] },
      },
    },
    include: {
      journey: {
        include: {
          route: true,
          operator: { select: { name: true, contactPhone: true } },
          gpsLogs: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  let locationText = 'Unknown location';
  let lat: number | null = null;
  let lng: number | null = null;
  let journeyId: string | null = null;
  let busRegistration = 'N/A';
  let operatorName = 'N/A';
  let routeText = 'N/A';

  if (activeBooking) {
    journeyId = activeBooking.journeyId;
    busRegistration = activeBooking.journey.busRegistration;
    operatorName = activeBooking.journey.operator.name;
    routeText = `${activeBooking.journey.route.fromCity} -> ${activeBooking.journey.route.toCity}`;

    const latestGps = activeBooking.journey.gpsLogs[0];
    if (latestGps) {
      lat = Number(latestGps.lat);
      lng = Number(latestGps.lng);
      locationText = reverseGeocode(lat, lng);
    }
  }

  // Create SOS event
  if (journeyId) {
    await prisma.sosEvent.create({
      data: {
        journeyId,
        userId: user?.id,
        phone,
        lat: lat !== null ? lat : undefined,
        lng: lng !== null ? lng : undefined,
      },
    });
  }

  // Build emergency message
  const emergencyMsg = [
    `[ZedPulse SOS ALERT]`,
    `Passenger: ${phone}`,
    `Location: ${locationText}`,
    lat && lng ? `GPS: ${lat},${lng}` : '',
    `Route: ${routeText}`,
    `Bus: ${busRegistration}`,
    `Operator: ${operatorName}`,
    `Time: ${new Date().toLocaleString('en-ZM')}`,
    `Immediate response required.`,
  ]
    .filter(Boolean)
    .join('\n');

  // Notify all emergency services in parallel
  await Promise.all([
    addSMSJob(EMERGENCY_PHONE, emergencyMsg),
    addSMSJob(RTSA_PHONE, emergencyMsg),
    addSMSJob(POLICE_PHONE, emergencyMsg),
  ]);

  // Notify the operator
  if (activeBooking) {
    const operatorPhone = activeBooking.journey.operator.contactPhone;
    if (operatorPhone) {
      await addSMSJob(
        formatZambianPhone(operatorPhone),
        `[ZedPulse SOS] Emergency on bus ${busRegistration}, route ${routeText}. Location: ${locationText}. Passenger: ${phone}. Take immediate action.`
      );
    }
  }

  // Confirm to the user
  await addSMSJob(
    phone,
    `[ZedPulse SOS] Your emergency alert has been received. Police, RTSA, and emergency services have been notified. Help is on the way. If you are in immediate danger, call 911 or 999.`
  );

  return `END SOS ALERT SENT!\n\nEmergency services, RTSA, and police have been notified.\n\nYour location: ${locationText}\n\nStay calm. Help is on the way.\n\nIf in immediate danger, call 911.`;
}
