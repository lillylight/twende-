import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { getCurrentUser } from '@/lib/auth';
import { checkSafetyThresholds } from '@/lib/safety/thresholds';

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
          error: { code: 'FORBIDDEN', message: 'Only drivers can submit GPS positions.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { journeyId, lat, lng, speed, heading, altitude, accuracy } = body;

    if (!journeyId || lat === undefined || lng === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'journeyId, lat, and lng are required.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const journey = await prisma.journey.findUnique({
      where: { id: journeyId },
      select: { id: true, status: true, operatorId: true, driverId: true, vehicleId: true },
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

    const currentSpeed = speed ?? 0;
    const currentHeading = heading ?? 0;
    const timestamp = new Date();

    // Store position in Redis for real-time access
    const positionData = {
      journeyId,
      lat,
      lng,
      speed: currentSpeed,
      heading: currentHeading,
      altitude: altitude ?? null,
      accuracy: accuracy ?? null,
      timestamp: timestamp.toISOString(),
    };

    await redis.set(
      `tracking:journey:${journeyId}`,
      JSON.stringify(positionData),
      'EX',
      300 // 5 minute TTL
    );

    // Also store in a sorted set for journey history
    await redis.zadd(
      `tracking:history:${journeyId}`,
      timestamp.getTime(),
      JSON.stringify(positionData)
    );

    // Log to database
    await prisma.gpsLog.create({
      data: {
        journeyId,
        vehicleId: journey.vehicleId,
        driverId: journey.driverId,
        lat,
        lng,
        speedKmh: currentSpeed,
        heading: currentHeading,
        altitude: altitude ?? null,
        accuracy: accuracy ?? null,
        timestamp,
      },
    });

    // Update journey's current position
    await prisma.journey.update({
      where: { id: journeyId },
      data: {
        currentLat: lat,
        currentLng: lng,
        currentSpeed: currentSpeed,
        lastPositionAt: timestamp,
      },
    });

    // Check safety thresholds (speeding, route deviation)
    const safetyResult = await checkSafetyThresholds(journeyId, {
      lat,
      lng,
      speed: currentSpeed,
      operatorId: journey.operatorId,
    });

    // Publish to Redis pub/sub for WebSocket subscribers
    await redis.publish(`tracking:live:${journeyId}`, JSON.stringify(positionData));

    return NextResponse.json(
      {
        success: true,
        data: {
          recorded: true,
          timestamp: timestamp.toISOString(),
          safety: {
            speedAlert: safetyResult.speedAlert,
            routeDeviationAlert: safetyResult.routeDeviationAlert,
            speedSeverity: safetyResult.speedSeverity,
            routeDeviationSeverity: safetyResult.routeDeviationSeverity,
          },
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Tracking] Position submit error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to record position.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
