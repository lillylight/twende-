import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { getCurrentUser } from '@/lib/auth';
import { addSMSJob } from '@/lib/queues/sms.queue';
import { reverseGeocode } from '@/lib/geocoding';
import { broadcastSafetyAlert } from '@/lib/websocket';

const RTSA_PHONE = process.env.RTSA_ALERT_PHONE ?? '+260211234567';
const EMERGENCY_PHONE = process.env.EMERGENCY_PHONE ?? '+260211999999';
const POLICE_PHONE = process.env.POLICE_PHONE ?? '+260211911111';

// SOS active key TTL: 24 hours (covers longest possible journey)
const SOS_ACTIVE_TTL_SECONDS = 86400;
// False alarm cancellation window: 2 minutes
const FALSE_ALARM_WINDOW_MS = 2 * 60 * 1000;

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

    // Verify user is associated with this journey (passenger with booking, driver, or RTSA)
    if (user.role !== 'RTSA_OFFICIAL' && user.role !== 'ADMIN') {
      const isDriver = journey.driverId === user.userId;
      const hasBooking = await prisma.booking.findFirst({
        where: {
          journeyId,
          userId: user.userId,
          status: { in: ['CONFIRMED', 'CHECKED_IN', 'RESERVED'] },
        },
        select: { id: true },
      });
      if (!isDriver && !hasBooking) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'FORBIDDEN', message: 'You are not associated with this journey.' },
            timestamp: new Date().toISOString(),
          },
          { status: 403 }
        );
      }
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

    // Set Redis key for active SOS tracking
    const sosData = JSON.stringify({
      sosId: sosEvent.id,
      journeyId,
      userId: user.userId,
      activatedAt: sosEvent.createdAt.toISOString(),
    });
    await redis.set(`sos:active:${journeyId}`, sosData, 'EX', SOS_ACTIVE_TTL_SECONDS);

    // Store SOS activation timestamp separately for quick lookup
    await redis.set(
      `sos:activated_at:${journeyId}`,
      sosEvent.createdAt.toISOString(),
      'EX',
      SOS_ACTIVE_TTL_SECONDS
    );

    // Broadcast SOS safety alert through WebSocket/SSE
    await broadcastSafetyAlert(journeyId, {
      journeyId,
      alertType: 'SOS',
      severity: 'CRITICAL',
      data: {
        sosId: sosEvent.id,
        lat,
        lng,
        location: locationText,
        reportedBy: user.phone,
        description: description ?? null,
      },
      timestamp: new Date().toISOString(),
    });

    const routeName = `${journey.route.fromCity} -> ${journey.route.toCity}`;
    const busReg = journey.vehicle.registrationPlate;

    // Build emergency alert message
    const emergencyMsg = [
      `[Twende SOS ALERT]`,
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
        `[Twende SOS] Emergency on bus ${busReg}, route ${routeName}. Location: ${locationText}. Reported by passenger. Take immediate action.`
      );
    }

    // Confirm to the user
    await addSMSJob(
      user.phone,
      `[Twende SOS] Your emergency alert has been sent. Police, RTSA, and emergency services have been notified at your location: ${locationText}. Help is on the way.`
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
        `[Twende ALERT] An SOS emergency has been reported on your bus (${routeName}). Emergency services have been contacted. Stay calm.`
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
          activatedAt: sosEvent.createdAt.toISOString(),
          notifiedServices: ['Emergency Services', 'RTSA', 'Police', 'Operator'],
          cancelWindowExpiresAt: new Date(
            sosEvent.createdAt.getTime() + FALSE_ALARM_WINDOW_MS
          ).toISOString(),
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

/**
 * DELETE /api/sos/[journeyId]
 * Cancel a false alarm within the 2-minute cancellation window.
 */
export async function DELETE(
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

    // Check if SOS is active
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

    // Find the active SOS event
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
          error: { code: 'NOT_FOUND', message: 'Active SOS event not found.' },
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
              'The 2-minute cancellation window has expired. Use the resolve endpoint instead.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Update SOS event to FALSE_ALARM
    await prisma.sosEvent.update({
      where: { id: sosEvent.id },
      data: {
        status: 'FALSE_ALARM',
        resolved: true,
        resolvedAt: new Date(),
      },
    });

    // Clean up Redis keys
    await redis.del(`sos:active:${journeyId}`);
    await redis.del(`sos:activated_at:${journeyId}`);
    await redis.del(`sos:positions:${journeyId}`);

    // Send cancellation SMS to all previously notified parties
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

    // Notify emergency services of cancellation
    await Promise.all([
      addSMSJob(EMERGENCY_PHONE, cancellationMsg),
      addSMSJob(RTSA_PHONE, cancellationMsg),
      addSMSJob(POLICE_PHONE, cancellationMsg),
    ]);

    // Notify operator
    if (journey?.operator.contactPhone) {
      await addSMSJob(journey.operator.contactPhone, cancellationMsg);
    }

    // Notify the user who triggered the SOS
    await addSMSJob(
      user.phone,
      `[Twende SOS] Your SOS alert has been cancelled as a false alarm. If you are still in danger, please trigger a new SOS alert.`
    );

    // Notify passengers
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

    console.log(`[SOS] False alarm cancelled for journey ${journeyId}, SOS ${sosEvent.id}`);

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
