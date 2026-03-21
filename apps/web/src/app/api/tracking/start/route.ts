import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { getCurrentUser } from '@/lib/auth';
import { addSMSJob } from '@/lib/queues/sms.queue';

export async function POST(request: NextRequest) {
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

    if (user.role !== 'DRIVER') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only drivers can start journey tracking.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { journeyId, lat, lng } = body;

    if (!journeyId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'journeyId is required.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const journey = await prisma.journey.findUnique({
      where: { id: journeyId },
      include: {
        route: { select: { fromCity: true, toCity: true } },
        bookings: {
          where: { status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
          select: { passengerPhone: true },
        },
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

    if (journey.status !== 'SCHEDULED' && journey.status !== 'BOARDING') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Journey cannot be started from status: ${journey.status}.`,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const now = new Date();

    // Update journey status to EN_ROUTE
    await prisma.journey.update({
      where: { id: journeyId },
      data: {
        status: 'EN_ROUTE',
        actualDeparture: now,
        currentLat: lat ?? null,
        currentLng: lng ?? null,
        lastPositionAt: now,
      },
    });

    // Set initial tracking data in Redis
    if (lat && lng) {
      await redis.set(
        `tracking:journey:${journeyId}`,
        JSON.stringify({
          journeyId,
          lat,
          lng,
          speed: 0,
          heading: 0,
          timestamp: now.toISOString(),
        }),
        'EX',
        300
      );
    }

    // Mark the journey as active in a Redis set for quick lookup
    await redis.sadd('tracking:active_journeys', journeyId);

    // Notify booked passengers that the journey has started
    const routeName = `${journey.route.fromCity} -> ${journey.route.toCity}`;
    for (const booking of journey.bookings) {
      await addSMSJob(
        booking.passengerPhone,
        `[ZedPulse] Your bus on ${routeName} has departed. Track live: ${process.env.NEXT_PUBLIC_APP_URL ?? 'https://zedpulse.co.zm'}/track/${journey.trackingToken}`
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          journeyId,
          status: 'EN_ROUTE',
          startedAt: now.toISOString(),
          trackingToken: journey.trackingToken,
        },
        message: 'Journey tracking started. Passengers have been notified.',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Tracking] Start error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to start tracking.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
