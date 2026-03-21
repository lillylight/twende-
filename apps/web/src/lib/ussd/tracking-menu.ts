import { prisma } from '../prisma';
import { calculateETA, reverseGeocode } from '../geocoding';
import { formatZambianPhone } from '../utils';
import { addSMSJob } from '../queues/sms.queue';
import { type USSDSession, setSession } from './session';

export async function handle(
  inputs: string[],
  session: USSDSession,
  sessionId: string
): Promise<string> {
  const step = session.step;

  // Step 1: Ask for booking reference
  if (step === 0) {
    session.step = 1;
    session.currentMenu = 'tracking';
    await setSession(sessionId, session);

    return 'CON Enter your booking reference (e.g. ZP-ABC123):';
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
      return 'END Booking not found. Please check your reference and try again.';
    }

    const journey = booking.journey;
    const route = journey.route;
    const latestGps = journey.gpsLogs[0];

    if (!latestGps) {
      const statusText =
        journey.status === 'SCHEDULED' ? 'Bus has not departed yet.' : 'No GPS data available.';

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

    return `CON ${route.fromCity} -> ${route.toCity}\nLocation: ${nearestTown}\nSpeed: ${speed}km/h\nETA: ${etaText}\n\n1. Share tracking link\n2. SOS Emergency\n3. Report reckless driving`;
  }

  // Step 3: Handle tracking actions
  if (step === 2) {
    const input = parseInt(inputs[inputs.length - 1], 10);
    const phone = formatZambianPhone(session.phoneNumber);

    if (input === 1) {
      // Share tracking link
      const trackingToken = session.data.trackingToken;
      const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://zedpulse.co.zm'}/track/${trackingToken}`;

      await addSMSJob(phone, `Track your ZedPulse bus live: ${trackingUrl}`);

      return 'END Tracking link has been sent to your phone via SMS.';
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
        `[ZedPulse SOS] Emergency on journey ${journeyId}. Passenger: ${phone}. Location: ${location}. Immediate response required.`
      );

      await addSMSJob(
        phone,
        `[ZedPulse SOS] Your emergency alert has been sent. Help is on the way. Stay calm and stay on the bus if safe to do so.`
      );

      return 'END SOS alert sent! Emergency services have been notified. Help is on the way.';
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
        `[ZedPulse Report] Reckless driving reported by passenger on journey ${journeyId}. Bus: ${journey?.busRegistration ?? 'N/A'}. Please investigate.`
      );

      return 'END Thank you for reporting. Your report has been sent to RTSA for investigation.';
    }

    return 'END Invalid option. Please try again.';
  }

  return 'END An error occurred. Please try again.';
}
