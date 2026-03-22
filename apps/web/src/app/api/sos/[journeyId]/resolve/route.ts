import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { getCurrentUser } from '@/lib/auth';
import { addSMSJob } from '@/lib/queues/sms.queue';

const RTSA_PHONE = process.env.RTSA_ALERT_PHONE ?? '+260211234567';
const EMERGENCY_PHONE = process.env.EMERGENCY_PHONE ?? '+260211999999';

/**
 * POST /api/sos/[journeyId]/resolve
 * Resolve an active SOS event. Only RTSA officials or operator admins can resolve.
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

    // Only RTSA officials or operator admins can resolve SOS events
    if (user.role !== 'RTSA_OFFICIAL' && user.role !== 'OPERATOR_ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only RTSA officials or operator admins can resolve SOS events.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const { journeyId } = await params;
    const body = await request.json().catch(() => ({}));
    const { notes } = body as { notes?: string };

    // Find the active SOS event for this journey
    const sosEvent = await prisma.sosEvent.findFirst({
      where: {
        journeyId,
        status: { in: ['ACTIVE', 'ACKNOWLEDGED', 'RESPONDING'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!sosEvent) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'No active SOS event found for this journey.' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Update SOS event to RESOLVED
    const resolvedAt = new Date();
    await prisma.sosEvent.update({
      where: { id: sosEvent.id },
      data: {
        status: 'RESOLVED',
        resolved: true,
        resolvedAt,
      },
    });

    // Clean up all Redis tracking data for this SOS
    await redis.del(`sos:active:${journeyId}`);
    await redis.del(`sos:activated_at:${journeyId}`);
    await redis.del(`sos:positions:${journeyId}`);

    // Get journey details for notifications
    const journey = await prisma.journey.findUnique({
      where: { id: journeyId },
      include: {
        route: { select: { fromCity: true, toCity: true } },
        operator: { select: { name: true, contactPhone: true } },
        vehicle: { select: { registrationPlate: true } },
      },
    });

    const routeName = journey
      ? `${journey.route.fromCity} -> ${journey.route.toCity}`
      : 'Unknown route';
    const busReg = journey?.vehicle.registrationPlate ?? 'Unknown';

    const resolutionMsg = [
      `[Twende SOS RESOLVED]`,
      `Bus: ${busReg}`,
      `Route: ${routeName}`,
      `Resolved by: ${user.role === 'RTSA_OFFICIAL' ? 'RTSA' : (journey?.operator.name ?? 'Operator')}`,
      notes ? `Notes: ${notes}` : '',
      `Time: ${resolvedAt.toLocaleString('en-ZM')}`,
    ]
      .filter(Boolean)
      .join('\n');

    // Notify emergency services of resolution
    await Promise.all([
      addSMSJob(EMERGENCY_PHONE, resolutionMsg),
      addSMSJob(RTSA_PHONE, resolutionMsg),
    ]);

    // Notify operator
    if (journey?.operator.contactPhone) {
      await addSMSJob(journey.operator.contactPhone, resolutionMsg);
    }

    // Notify the original SOS reporter
    if (sosEvent.phone) {
      await addSMSJob(
        sosEvent.phone,
        `[Twende SOS] The emergency on your journey (${routeName}) has been resolved. Thank you for using the SOS system. Your safety matters.`
      );
    }

    // Notify all passengers on the journey
    const bookings = await prisma.booking.findMany({
      where: {
        journeyId,
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        passengerPhone: { not: sosEvent.phone },
      },
      select: { passengerPhone: true },
    });

    for (const booking of bookings) {
      await addSMSJob(
        booking.passengerPhone,
        `[Twende ALERT] The SOS emergency on your bus (${routeName}) has been resolved. Thank you for your patience.`
      );
    }

    const durationMinutes = Math.round(
      (resolvedAt.getTime() - sosEvent.createdAt.getTime()) / 60000
    );

    console.log(
      `[SOS] Resolved: journey=${journeyId}, sosId=${sosEvent.id}, duration=${durationMinutes}min, resolvedBy=${user.userId}`
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          sosId: sosEvent.id,
          journeyId,
          status: 'RESOLVED',
          resolvedAt: resolvedAt.toISOString(),
          resolvedBy: user.userId,
          durationMinutes,
          notes: notes ?? null,
        },
        message: 'SOS event resolved. All parties have been notified.',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[SOS] Resolve error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to resolve SOS event.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
