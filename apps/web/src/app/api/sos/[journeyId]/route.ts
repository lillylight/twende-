import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { getCurrentUser } from '@/lib/auth';
import { addSMSJob } from '@/lib/queues/sms.queue';
import { reverseGeocode } from '@/lib/geocoding';

const RTSA_PHONE = process.env.RTSA_ALERT_PHONE ?? '+260211234567';
const EMERGENCY_PHONE = process.env.EMERGENCY_PHONE ?? '+260211999999';
const POLICE_PHONE = process.env.POLICE_PHONE ?? '+260211911111';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ journeyId: string }> }
) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    const { journeyId } = await params;
    const body = await request.json().catch(() => ({}));
    const { description } = body as { description?: string };

    const journey = await prisma.journey.findUnique({
      where: { id: journeyId },
      include: {
        route: { select: { fromCity: true, toCity: true } },
        operator: { select: { name: true, contactPhone: true } },
        vehicle: { select: { registrationPlate: true } },
      },
    });

    if (!journey) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Journey not found.' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Get the latest position from Redis
    let lat: number | null = null;
    let lng: number | null = null;
    let locationText = 'Unknown location';

    const liveData = await redis.get(`tracking:journey:${journeyId}`);
    if (liveData) {
      const parsed = JSON.parse(liveData);
      lat = parsed.lat;
      lng = parsed.lng;
      locationText = reverseGeocode(parsed.lat, parsed.lng);
    } else if (journey.currentLat && journey.currentLng) {
      lat = journey.currentLat;
      lng = journey.currentLng;
      locationText = reverseGeocode(journey.currentLat, journey.currentLng);
    }

    // Create SOS event
    const sosEvent = await prisma.sosEvent.create({
      data: {
        journeyId,
        userId: user.userId,
        phone: user.phone,
        lat,
        lng,
        description: description ?? null,
        status: 'ACTIVE',
      },
    });

    const routeName = `${journey.route.fromCity} -> ${journey.route.toCity}`;
    const busReg = journey.vehicle.registrationPlate;

    // Build emergency alert message
    const emergencyMsg = [
      `[ZedPulse SOS ALERT]`,
      `Journey: ${journeyId}`,
      `Route: ${routeName}`,
      `Bus: ${busReg}`,
      `Operator: ${journey.operator.name}`,
      `Location: ${locationText}`,
      lat && lng ? `GPS: ${lat},${lng}` : '',
      `Reported by: ${user.phone}`,
      description ? `Details: ${description}` : '',
      `Time: ${new Date().toLocaleString('en-ZM')}`,
      `IMMEDIATE RESPONSE REQUIRED`,
    ]
      .filter(Boolean)
      .join('\n');

    // Notify all emergency contacts in parallel
    await Promise.all([
      addSMSJob(EMERGENCY_PHONE, emergencyMsg),
      addSMSJob(RTSA_PHONE, emergencyMsg),
      addSMSJob(POLICE_PHONE, emergencyMsg),
    ]);

    // Notify the operator
    if (journey.operator.contactPhone) {
      await addSMSJob(
        journey.operator.contactPhone,
        `[ZedPulse SOS] Emergency on bus ${busReg}, route ${routeName}. Location: ${locationText}. Reported by passenger. Take immediate action.`
      );
    }

    // Confirm to the user
    await addSMSJob(
      user.phone,
      `[ZedPulse SOS] Your emergency alert has been sent. Police, RTSA, and emergency services have been notified at your location: ${locationText}. Help is on the way.`
    );

    // Also notify all other passengers on this journey
    const bookings = await prisma.booking.findMany({
      where: {
        journeyId,
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        passengerPhone: { not: user.phone },
      },
      select: { passengerPhone: true },
    });

    for (const booking of bookings) {
      await addSMSJob(
        booking.passengerPhone,
        `[ZedPulse ALERT] An SOS emergency has been reported on your bus (${routeName}). Emergency services have been contacted. Stay calm.`
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          sosId: sosEvent.id,
          journeyId,
          status: 'ACTIVE',
          location: locationText,
          notifiedServices: ['Emergency Services', 'RTSA', 'Police', 'Operator'],
        },
        message: 'SOS alert sent. Emergency services have been notified.',
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[SOS] Trigger error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to trigger SOS alert.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
