import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import { reverseGeocode, calculateETA } from '@/lib/geocoding';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find the journey by tracking token
    const journey = await prisma.journey.findFirst({
      where: { trackingToken: token },
      include: {
        route: {
          select: { fromCity: true, toCity: true, name: true, distanceKm: true },
        },
        operator: {
          select: { name: true },
        },
        vehicle: {
          select: { registrationPlate: true, make: true, model: true },
        },
      },
    });

    if (!journey) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Invalid tracking link.' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Get live position from Redis
    const liveData = await redis.get(`tracking:journey:${journey.id}`);
    let position = null;
    let location: string | null = null;
    let eta = null;
    let isLive = false;

    if (liveData) {
      const parsed = JSON.parse(liveData);
      position = {
        lat: parsed.lat,
        lng: parsed.lng,
        speed: parsed.speed,
        heading: parsed.heading,
        timestamp: parsed.timestamp,
      };
      location = reverseGeocode(parsed.lat, parsed.lng);
      eta = await calculateETA(journey.id, parsed.lat, parsed.lng);
      isLive = true;
    } else if (journey.currentLat && journey.currentLng) {
      position = {
        lat: journey.currentLat,
        lng: journey.currentLng,
        speed: journey.currentSpeed,
        timestamp: journey.lastPositionAt?.toISOString(),
      };
      location = reverseGeocode(journey.currentLat, journey.currentLng);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          journey: {
            id: journey.id,
            status: journey.status,
            route: journey.route,
            operator: journey.operator.name,
            vehicle: {
              registrationPlate: journey.vehicle.registrationPlate,
              make: journey.vehicle.make,
              model: journey.vehicle.model,
            },
            departureTime: journey.departureTime,
            arrivalTime: journey.arrivalTime,
          },
          tracking: {
            position,
            location,
            eta: eta
              ? {
                  etaMinutes: eta.etaMinutes,
                  remainingDistanceKm: eta.remainingDistanceKm,
                }
              : null,
            isLive,
          },
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Tracking] Public tracking error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tracking data.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
