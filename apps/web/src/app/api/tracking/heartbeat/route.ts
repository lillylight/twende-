import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { getCurrentUser } from '@/lib/auth';

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
          error: { code: 'FORBIDDEN', message: 'Only drivers can send heartbeats.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { journeyId, lat, lng, batteryLevel, networkType } = body;

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

    const timestamp = new Date();

    // Store heartbeat in Redis
    const heartbeatData = {
      journeyId,
      driverId: user.userId,
      lat: lat ?? null,
      lng: lng ?? null,
      batteryLevel: batteryLevel ?? null,
      networkType: networkType ?? null,
      timestamp: timestamp.toISOString(),
    };

    await redis.set(
      `tracking:heartbeat:${journeyId}`,
      JSON.stringify(heartbeatData),
      'EX',
      120 // 2 minute TTL; if no heartbeat in 2 mins, driver may be offline
    );

    // Update the driver's last-seen timestamp
    await redis.set(`driver:lastseen:${user.userId}`, timestamp.toISOString(), 'EX', 300);

    return NextResponse.json(
      {
        success: true,
        data: {
          acknowledged: true,
          timestamp: timestamp.toISOString(),
          nextHeartbeatSeconds: 60,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Tracking] Heartbeat error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to process heartbeat.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
