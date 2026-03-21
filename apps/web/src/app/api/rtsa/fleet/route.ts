import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { getCurrentUser } from '@/lib/auth';
import { reverseGeocode } from '@/lib/geocoding';

export async function GET(request: NextRequest) {
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

    if (user.role !== 'RTSA_OFFICER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'RTSA officials only.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    // Get all active journeys (EN_ROUTE or BOARDING)
    const activeJourneys = await prisma.journey.findMany({
      where: {
        status: { in: ['EN_ROUTE', 'BOARDING'] },
      },
      include: {
        route: { select: { fromCity: true, toCity: true, name: true } },
        operator: { select: { id: true, name: true, complianceScore: true } },
        vehicle: { select: { registrationPlate: true, make: true, model: true } },
        driver: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true, phone: true } },
            averageRating: true,
          },
        },
        _count: {
          select: {
            bookings: { where: { status: { in: ['CONFIRMED', 'CHECKED_IN'] } } },
          },
        },
      },
      orderBy: { departureTime: 'desc' },
    });

    // Enrich with live positions from Redis
    const enriched = await Promise.all(
      activeJourneys.map(async (journey) => {
        let livePosition = null;
        let location: string | null = null;

        const liveData = await redis.get(`tracking:journey:${journey.id}`);
        if (liveData) {
          const parsed = JSON.parse(liveData);
          livePosition = {
            lat: parsed.lat,
            lng: parsed.lng,
            speed: parsed.speed,
            heading: parsed.heading,
            timestamp: parsed.timestamp,
          };
          location = reverseGeocode(parsed.lat, parsed.lng);
        } else if (journey.currentLat && journey.currentLng) {
          livePosition = {
            lat: journey.currentLat,
            lng: journey.currentLng,
            speed: journey.currentSpeed,
            timestamp: journey.lastPositionAt?.toISOString(),
          };
          location = reverseGeocode(journey.currentLat, journey.currentLng);
        }

        return {
          id: journey.id,
          status: journey.status,
          route: journey.route,
          operator: journey.operator,
          vehicle: journey.vehicle,
          driver: journey.driver,
          passengerCount: journey._count.bookings,
          totalSeats: journey.totalSeats,
          departureTime: journey.departureTime,
          position: livePosition,
          location,
        };
      })
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          totalActive: enriched.length,
          journeys: enriched,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[RTSA] Fleet overview error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch fleet data.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
