import { prisma } from '../prisma';
import { calculateETA, reverseGeocode } from '../geocoding';
import { formatZambianPhone } from '../utils';
import { addSMSJob } from '../queues/sms.queue';
import { type USSDSession, setSession } from './session';
import { t } from '../i18n';

export async function handle(
  inputs: string[],
  session: USSDSession,
  sessionId: string
): Promise<string> {
  const step = session.step;
  const lang = session.data.language ?? 'en';

  // Step 1: Ask for booking reference
  if (step === 0) {
    session.step = 1;
    session.currentMenu = 'tracking';
    await setSession(sessionId, session);

    return `CON ${t('tracking_enter_ref', lang)}`;
  }

  // Step 2: Show tracking info
  if (step === 1) {
    const reference = inputs[inputs.length - 1].trim().toUpperCase();

    const booking = await prisma.booking.findUnique({
      where: { reference },
      include: {
        journey: {
          include: {
            route: true,
            gpsLogs: {
              orderBy: { timestamp: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!booking) {
      return `END ${t('booking_not_found', lang)}`;
    }

    const journey = booking.journey;
    const route = journey.route;
    const latestGps = journey.gpsLogs[0];

    if (!latestGps) {
      const statusText =
        journey.status === 'SCHEDULED' ? t('no_gps_scheduled', lang) : t('no_gps_data', lang);

      return `END ${route.fromCity} -> ${route.toCity}\nStatus: ${journey.status}\n${statusText}\nDeparture: ${journey.departureTime.toLocaleTimeString('en-ZM', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
    }

    const lat = Number(latestGps.lat);
    const lng = Number(latestGps.lng);
    const speed = latestGps.speedKmh;
    const nearestTown = reverseGeocode(lat, lng);

    const eta = await calculateETA(journey.id, lat, lng);
    const etaText = eta ? `${eta.etaMinutes} min` : 'calculating...';

    session.data.journeyId = journey.id;
    session.data.reference = reference;
    session.data.trackingToken = journey.trackingToken;
    session.step = 2;
    await setSession(sessionId, session);

    return `CON ${t('tracking_status', lang, {
      fromCity: route.fromCity,
      toCity: route.toCity,
      location: nearestTown,
      speed: speed.toString(),
      eta: etaText,
    })}`;
  }

  // Step 3: Handle tracking actions
  if (step === 2) {
    const input = parseInt(inputs[inputs.length - 1], 10);
    const phone = formatZambianPhone(session.phoneNumber);

    if (input === 1) {
      // Share tracking link
      const trackingToken = session.data.trackingToken;
      const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://twende.co.zm'}/track/${trackingToken}`;

      await addSMSJob(phone, t('tracking_sms_link', lang, { url: trackingUrl }));

      return `END ${t('tracking_link_sent', lang)}`;
    }

    if (input === 2) {
      // SOS Emergency
      const journeyId = session.data.journeyId;

      const journey = await prisma.journey.findUnique({
        where: { id: journeyId },
        include: {
          gpsLogs: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      });

      const latestGps = journey?.gpsLogs[0];

      const user = await prisma.user.findUnique({
        where: { phone },
      });

      await prisma.sosEvent.create({
        data: {
          journeyId,
          userId: user?.id,
          phone,
          lat: latestGps ? latestGps.lat : null,
          lng: latestGps ? latestGps.lng : null,
        },
      });

      // Notify emergency services
      const emergencyPhone = process.env.EMERGENCY_PHONE ?? '+260211999999';
      const location = latestGps
        ? reverseGeocode(Number(latestGps.lat), Number(latestGps.lng))
        : 'Unknown';

      await addSMSJob(
        emergencyPhone,
        t('tracking_sms_sos_emergency', lang, {
          journeyId,
          phone,
          location,
        })
      );

      await addSMSJob(phone, t('tracking_sms_sos', lang));

      return `END ${t('sos_sent', lang)}`;
    }

    if (input === 3) {
      // Report reckless driving
      const journeyId = session.data.journeyId;

      const journey = await prisma.journey.findUnique({
        where: { id: journeyId },
        include: {
          gpsLogs: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      });

      const latestGps = journey?.gpsLogs[0];

      if (journey) {
        await prisma.safetyAlert.create({
          data: {
            journeyId,
            operatorId: journey.operatorId,
            alertType: 'SPEEDING',
            severity: 'WARNING',
            data: {
              reportedBy: phone,
              type: 'passenger_report',
              lat: latestGps ? Number(latestGps.lat) : null,
              lng: latestGps ? Number(latestGps.lng) : null,
            },
          },
        });
      }

      const rtsaPhone = process.env.RTSA_ALERT_PHONE ?? '+260211234567';
      await addSMSJob(
        rtsaPhone,
        t('tracking_sms_reckless', lang, {
          journeyId,
          bus: journey?.busRegistration ?? 'N/A',
        })
      );

      return `END ${t('report_driver', lang)}`;
    }

    return `END ${t('invalid_option', lang)}`;
  }

  return `END ${t('error_occurred', lang)}`;
}
