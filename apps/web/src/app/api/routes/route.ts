import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));
    const skip = (page - 1) * pageSize;

    const fromCity = searchParams.get('fromCity');
    const toCity = searchParams.get('toCity');

    const where: Record<string, unknown> = { isActive: true };
    if (fromCity) where.fromCity = fromCity;
    if (toCity) where.toCity = toCity;

    const [routes, totalItems] = await Promise.all([
      prisma.route.findMany({
        where,
        include: {
          _count: {
            select: { journeys: true },
          },
        },
        orderBy: { fromCity: 'asc' },
        skip,
        take: pageSize,
      }),
      prisma.route.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);

    return NextResponse.json(
      {
        success: true,
        data: routes.map((route) => ({
          id: route.id,
          fromCity: route.fromCity,
          toCity: route.toCity,
          distanceKm: route.distanceKm,
          estimatedDurationMinutes: route.estimatedDurationMinutes,
          waypoints: route.waypoints,
          isActive: route.isActive,
          journeyCount: route._count.journeys,
          createdAt: route.createdAt,
        })),
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Routes] List error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch routes.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getCurrentUser(request);

    if (!auth) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    if (auth.role !== 'OPERATOR_ADMIN' && auth.role !== 'RTSA_OFFICIAL') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only operators can create routes.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { fromCity, toCity, distanceKm, estimatedDurationMinutes, waypoints } = body;

    if (!fromCity || !toCity || !distanceKm || !estimatedDurationMinutes) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'fromCity, toCity, distanceKm, and estimatedDurationMinutes are required.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    if (fromCity === toCity) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Departure and destination cities cannot be the same.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Validate waypoints format if provided
    let waypointsData: unknown[] = [];
    if (waypoints) {
      if (!Array.isArray(waypoints)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'waypoints must be an array of {lat, lng, name} objects.',
            },
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }

      for (const wp of waypoints) {
        if (typeof wp.lat !== 'number' || typeof wp.lng !== 'number') {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Each waypoint must have numeric lat and lng fields.',
              },
              timestamp: new Date().toISOString(),
            },
            { status: 400 }
          );
        }
      }
      waypointsData = waypoints;
    }

    const route = await prisma.route.create({
      data: {
        fromCity: fromCity.trim(),
        toCity: toCity.trim(),
        distanceKm: parseInt(distanceKm, 10),
        estimatedDurationMinutes: parseInt(estimatedDurationMinutes, 10),
        waypoints: waypointsData.length > 0 ? JSON.stringify(waypointsData) : '[]',
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: route,
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Routes] Create error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create route.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
