import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { reverseGeocode, calculateETA } from '@/lib/geocoding';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;

    // Try to get live position from Redis first
    const liveData = await redis.get(`tracking:journey:${id}`);

    if (liveData) {
      const position = JSON.parse(liveData);
      const nearestTown = reverseGeocode(position.lat, position.lng);
      const eta = await calculateETA(id, position.lat, position.lng);

      return NextResponse.json(
        {
          success: true,
          data: {
            journeyId: id,
            position: {
              lat: position.lat,
              lng: position.lng,
              speed: position.speed,
              heading: position.heading,
              timestamp: position.timestamp,
            },
            location: nearestTown,
            eta: eta
              ? {
                  etaMinutes: eta.etaMinutes,
                  remainingDistanceKm: eta.remainingDistanceKm,
                }
              : null,
            isLive: true,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Fallback to database
    const journey = await prisma.journey.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        currentLat: true,
        currentLng: true,
        currentSpeed: true,
        lastPositionAt: true,
        route: { select: { fromCity: true, toCity: true } },
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

    if (journey.currentLat && journey.currentLng) {
      const nearestTown = reverseGeocode(journey.currentLat, journey.currentLng);

      return NextResponse.json(
        {
          success: true,
          data: {
            journeyId: id,
            position: {
              lat: journey.currentLat,
              lng: journey.currentLng,
              speed: journey.currentSpeed,
              timestamp: journey.lastPositionAt?.toISOString(),
            },
            location: nearestTown,
            status: journey.status,
            isLive: false,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          journeyId: id,
          position: null,
          status: journey.status,
          isLive: false,
          message: 'No position data available for this journey.',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Tracking] Journey position error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch journey position.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
