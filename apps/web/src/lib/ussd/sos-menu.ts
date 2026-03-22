import { prisma } from '../prisma';
import { formatZambianPhone } from '../utils';
import { reverseGeocode } from '../geocoding';
import { addSMSJob } from '../queues/sms.queue';
import { t } from '../i18n';

const EMERGENCY_PHONE = process.env.EMERGENCY_PHONE ?? '+260211999999';
const RTSA_PHONE = process.env.RTSA_ALERT_PHONE ?? '+260211234567';
const POLICE_PHONE = process.env.POLICE_PHONE ?? '+260211911111';

export async function handle(
  phoneNumber: string,
  sessionId: string,
  lang: string = 'en'
): Promise<string> {
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
  const gpsLine = lat && lng ? `GPS: ${lat},${lng}\n` : '';
  const emergencyMsg = t('sos_sms_emergency', lang, {
    phone,
    location: locationText,
    gps: gpsLine,
    route: routeText,
    bus: busRegistration,
    operator: operatorName,
    time: new Date().toLocaleString('en-ZM'),
  });

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
        t('sos_sms_operator', lang, {
          bus: busRegistration,
          route: routeText,
          location: locationText,
          phone,
        })
      );
    }
  }

  // Confirm to the user
  await addSMSJob(phone, t('sos_sms_passenger', lang));

  return `END ${t('sos_confirm', lang, { location: locationText })}`;
}
