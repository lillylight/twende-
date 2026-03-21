import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { getCurrentUser } from '@/lib/auth';
import { checkSafetyThresholds } from '@/lib/safety/thresholds';

interface BulkPosition {
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  altitude?: number;
  accuracy?: number;
  timestamp: string;
}

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
    const { journeyId, positions } = body as { journeyId: string; positions: BulkPosition[] };

    if (!journeyId || !positions || !Array.isArray(positions) || positions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'journeyId and a non-empty positions array are required.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    if (positions.length > 500) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Maximum 500 positions per bulk upload.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const journey = await prisma.journey.findUnique({
      where: { id: journeyId },
      select: { id: true, operatorId: true, driverId: true, vehicleId: true },
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

    // Sort positions by timestamp
    const sorted = [...positions].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Batch insert GPS logs
    const gpsData = sorted.map((pos) => ({
      journeyId,
      vehicleId: journey.vehicleId,
      driverId: journey.driverId,
      lat: pos.lat,
      lng: pos.lng,
      speedKmh: pos.speed ?? 0,
      heading: pos.heading ?? 0,
      altitude: pos.altitude ?? null,
      accuracy: pos.accuracy ?? null,
      timestamp: new Date(pos.timestamp),
    }));

    await prisma.gpsLog.createMany({ data: gpsData });

    // Store the latest position in Redis and history
    const latest = sorted[sorted.length - 1];
    const latestTimestamp = new Date(latest.timestamp);
    const latestData = {
      journeyId,
      lat: latest.lat,
      lng: latest.lng,
      speed: latest.speed ?? 0,
      heading: latest.heading ?? 0,
      altitude: latest.altitude ?? null,
      accuracy: latest.accuracy ?? null,
      timestamp: latestTimestamp.toISOString(),
    };

    await redis.set(`tracking:journey:${journeyId}`, JSON.stringify(latestData), 'EX', 300);

    // Add all positions to history sorted set
    const pipeline = redis.pipeline();
    for (const pos of sorted) {
      const ts = new Date(pos.timestamp);
      pipeline.zadd(
        `tracking:history:${journeyId}`,
        ts.getTime(),
        JSON.stringify({
          lat: pos.lat,
          lng: pos.lng,
          speed: pos.speed ?? 0,
          heading: pos.heading ?? 0,
          timestamp: ts.toISOString(),
        })
      );
    }
    await pipeline.exec();

    // Update journey's current position to the latest
    await prisma.journey.update({
      where: { id: journeyId },
      data: {
        currentLat: latest.lat,
        currentLng: latest.lng,
        currentSpeed: latest.speed ?? 0,
        lastPositionAt: latestTimestamp,
      },
    });

    // Check safety thresholds on the latest position
    const safetyResult = await checkSafetyThresholds(journeyId, {
      lat: latest.lat,
      lng: latest.lng,
      speed: latest.speed ?? 0,
      operatorId: journey.operatorId,
    });

    // Publish latest position
    await redis.publish(`tracking:live:${journeyId}`, JSON.stringify(latestData));

    return NextResponse.json(
      {
        success: true,
        data: {
          recorded: positions.length,
          latestTimestamp: latestTimestamp.toISOString(),
          safety: {
            speedAlert: safetyResult.speedAlert,
            routeDeviationAlert: safetyResult.routeDeviationAlert,
          },
        },
        message: `${positions.length} positions recorded successfully.`,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Tracking] Bulk positions error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to record bulk positions.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
