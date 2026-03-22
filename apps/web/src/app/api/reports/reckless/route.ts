import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { getCurrentUser } from '@/lib/auth';
import { addSMSJob } from '@/lib/queues/sms.queue';

const RTSA_PHONE = process.env.RTSA_ALERT_PHONE ?? '+260211234567';

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

    const body = await request.json();
    const { journeyId, description, type } = body;

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
        operator: { select: { id: true, name: true } },
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

    // Get current position from Redis
    let lat: number | null = null;
    let lng: number | null = null;

    const liveData = await redis.get(`tracking:journey:${journeyId}`);
    if (liveData) {
      const parsed = JSON.parse(liveData);
      lat = parsed.lat;
      lng = parsed.lng;
    } else if (journey.currentLat && journey.currentLng) {
      lat = journey.currentLat;
      lng = journey.currentLng;
    }

    // Create safety alert
    const alertType = type ?? 'RECKLESS_DRIVING';
    const alert = await prisma.safetyAlert.create({
      data: {
        journeyId,
        operatorId: journey.operator.id,
        alertType,
        severity: 'WARNING',
        data: {
          reportedBy: user.phone,
          reportedByUserId: user.userId,
          type: 'passenger_report',
          description: description ?? 'Reckless driving reported by passenger',
          lat,
          lng,
        },
      },
    });

    // Notify RTSA
    const routeName = `${journey.route.fromCity} -> ${journey.route.toCity}`;
    const busReg = journey.vehicle.registrationPlate;

    await addSMSJob(
      RTSA_PHONE,
      `[Twende Report] Reckless driving reported by passenger. Route: ${routeName}, Bus: ${busReg}, Operator: ${journey.operator.name}. ${lat && lng ? `GPS: ${lat},${lng}` : ''}. Please investigate.`
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          alertId: alert.id,
          journeyId,
          type: alertType,
          severity: 'WARNING',
        },
        message: 'Report submitted. RTSA has been notified and will investigate.',
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Reports] Reckless driving report error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to submit report.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
