import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { getCurrentUser } from '@/lib/auth';
import { addSMSJob } from '@/lib/queues/sms.queue';
import { addAlertJob } from '@/lib/queues/alerts.queue';

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
          error: { code: 'FORBIDDEN', message: 'Only drivers can end journey tracking.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { journeyId } = body;

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
          select: { passengerPhone: true, id: true },
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

    if (journey.status !== 'EN_ROUTE' && journey.status !== 'BOARDING') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Journey cannot be ended from status: ${journey.status}.`,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const now = new Date();

    // Update journey status to COMPLETED
    await prisma.journey.update({
      where: { id: journeyId },
      data: {
        status: 'COMPLETED',
        actualArrival: now,
      },
    });

    // Mark all active bookings as COMPLETED
    await prisma.booking.updateMany({
      where: {
        journeyId,
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
      },
      data: { status: 'COMPLETED' },
    });

    // Clean up Redis tracking data
    await redis.srem('tracking:active_journeys', journeyId);
    await redis.del(`tracking:journey:${journeyId}`);
    await redis.del(`tracking:heartbeat:${journeyId}`);
    // Keep history for 24 hours for post-trip analysis
    await redis.expire(`tracking:history:${journeyId}`, 24 * 60 * 60);

    // Notify passengers
    const routeName = `${journey.route.fromCity} -> ${journey.route.toCity}`;
    for (const booking of journey.bookings) {
      await addSMSJob(
        booking.passengerPhone,
        `[ZedPulse] Your journey ${routeName} has arrived. Thank you for travelling with us! Rate your trip at ${process.env.NEXT_PUBLIC_APP_URL ?? 'https://zedpulse.co.zm'}/rate/${booking.id}`
      );
    }

    // Queue compliance score recalculation for the operator
    await addAlertJob({
      type: 'update_compliance_score',
      operatorId: journey.operatorId,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          journeyId,
          status: 'COMPLETED',
          arrivedAt: now.toISOString(),
          completedBookings: journey.bookings.length,
        },
        message: 'Journey completed. Passengers have been notified.',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Tracking] End error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to end tracking.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
