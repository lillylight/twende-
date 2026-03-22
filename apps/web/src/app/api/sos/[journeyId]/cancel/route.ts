import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { getCurrentUser } from '@/lib/auth';
import { addSMSJob } from '@/lib/queues/sms.queue';

const RTSA_PHONE = process.env.RTSA_ALERT_PHONE ?? '+260211234567';
const EMERGENCY_PHONE = process.env.EMERGENCY_PHONE ?? '+260211999999';
const POLICE_PHONE = process.env.POLICE_PHONE ?? '+260211911111';

// False alarm cancellation window: 2 minutes
const FALSE_ALARM_WINDOW_MS = 2 * 60 * 1000;

/**
 * POST /api/sos/[journeyId]/cancel
 * Cancel a false alarm within the 2-minute window.
 */
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

    // Check if SOS is active in Redis
    const sosActiveData = await redis.get(`sos:active:${journeyId}`);
    if (!sosActiveData) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'No active SOS found for this journey.' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    const sosInfo = JSON.parse(sosActiveData);

    // Find the active SOS event in the database
    const sosEvent = await prisma.sosEvent.findFirst({
      where: {
        id: sosInfo.sosId,
        journeyId,
        status: 'ACTIVE',
      },
    });

    if (!sosEvent) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Active SOS event not found in database.' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Check if within the 2-minute cancellation window
    const elapsed = Date.now() - sosEvent.createdAt.getTime();
    if (elapsed > FALSE_ALARM_WINDOW_MS) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CANCELLATION_EXPIRED',
            message:
              'The 2-minute cancellation window has expired. Contact authorities directly or use the resolve endpoint.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Update SOS event status to FALSE_ALARM
    await prisma.sosEvent.update({
      where: { id: sosEvent.id },
      data: {
        status: 'FALSE_ALARM',
        resolved: true,
        resolvedAt: new Date(),
      },
    });

    // Clean up Redis tracking data
    await redis.del(`sos:active:${journeyId}`);
    await redis.del(`sos:activated_at:${journeyId}`);
    await redis.del(`sos:positions:${journeyId}`);

    // Get journey details for notification messages
    const journey = await prisma.journey.findUnique({
      where: { id: journeyId },
      include: {
        route: { select: { fromCity: true, toCity: true } },
        operator: { select: { contactPhone: true } },
        vehicle: { select: { registrationPlate: true } },
      },
    });

    const routeName = journey
      ? `${journey.route.fromCity} -> ${journey.route.toCity}`
      : 'Unknown route';
    const busReg = journey?.vehicle.registrationPlate ?? 'Unknown';

    const cancellationMsg = `[Twende SOS CANCELLED] The SOS alert for bus ${busReg} on route ${routeName} has been cancelled (false alarm). No action required.`;

    // Notify all emergency services of cancellation
    await Promise.all([
      addSMSJob(EMERGENCY_PHONE, cancellationMsg),
      addSMSJob(RTSA_PHONE, cancellationMsg),
      addSMSJob(POLICE_PHONE, cancellationMsg),
    ]);

    // Notify operator
    if (journey?.operator.contactPhone) {
      await addSMSJob(journey.operator.contactPhone, cancellationMsg);
    }

    // Confirm to the user
    await addSMSJob(
      user.phone,
      `[Twende SOS] Your SOS alert has been cancelled as a false alarm. If you are still in danger, please trigger a new SOS alert.`
    );

    // Notify other passengers
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
        `[Twende ALERT] The SOS alert on your bus (${routeName}) has been cancelled. It was a false alarm. Your journey continues safely.`
      );
    }

    console.log(`[SOS] False alarm cancelled: journey=${journeyId}, sosId=${sosEvent.id}`);

    return NextResponse.json(
      {
        success: true,
        data: {
          sosId: sosEvent.id,
          journeyId,
          status: 'FALSE_ALARM',
          cancelledAt: new Date().toISOString(),
        },
        message: 'SOS alert cancelled as false alarm. All parties have been notified.',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[SOS] Cancel error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to cancel SOS alert.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
