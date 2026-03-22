import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const routeId = searchParams.get('routeId');
    const date = searchParams.get('date');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get('limit') ?? searchParams.get('limit') ?? '20', 10))
    );
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      status: 'SCHEDULED',
      availableSeats: { gt: 0 },
      departureTime: { gte: new Date() },
    };

    if (routeId) {
      where.routeId = routeId;
    } else if (from || to) {
      where.route = {};
      if (from) {
        (where.route as Record<string, unknown>).fromCity = { contains: from, mode: 'insensitive' };
      }
      if (to) {
        (where.route as Record<string, unknown>).toCity = { contains: to, mode: 'insensitive' };
      }
    }

    if (date) {
      const searchDate = new Date(date);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      where.departureTime = { gte: searchDate, lt: nextDay };
    }

    const [journeys, totalItems] = await Promise.all([
      prisma.journey.findMany({
        where,
        include: {
          route: {
            select: {
              id: true,
              name: true,
              fromCity: true,
              toCity: true,
              distanceKm: true,
              estimatedDurationMinutes: true,
            },
          },
          operator: {
            select: {
              id: true,
              name: true,
              complianceScore: true,
            },
          },
          vehicle: {
            select: {
              id: true,
              registrationPlate: true,
              make: true,
              model: true,
              capacity: true,
            },
          },
        },
        orderBy: { departureTime: 'asc' },
        skip,
        take: limit,
      }),
      prisma.journey.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json(
      {
        success: true,
        data: journeys.map((j) => ({
          id: j.id,
          route: j.route,
          operator: j.operator,
          vehicle: {
            id: j.vehicle.id,
            registrationPlate: j.vehicle.registrationPlate,
            make: j.vehicle.make,
            model: j.vehicle.model,
            capacity: j.vehicle.capacity,
          },
          status: j.status,
          departureTime: j.departureTime,
          arrivalTime: j.arrivalTime,
          price: j.price,
          availableSeats: j.availableSeats,
          totalSeats: j.totalSeats,
        })),
        pagination: {
          page,
          limit,
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
    console.error('[Journeys] Search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to search journeys.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
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

    if (user.role !== 'DRIVER' && user.role !== 'OPERATOR' && user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only drivers and operators can create journeys.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { routeId, vehicleId, driverId, departureTime, arrivalTime, price, totalSeats } = body;

    if (!routeId || !vehicleId || !departureTime || !price) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'routeId, vehicleId, departureTime, and price are required.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const route = await prisma.route.findUnique({ where: { id: routeId } });
    if (!route) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Route not found.' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Vehicle not found.' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Resolve the driver: use provided driverId, or look up the driver record for the current user
    let resolvedDriverId = driverId;
    if (!resolvedDriverId && user.role === 'DRIVER') {
      const driver = await prisma.driver.findUnique({ where: { userId: user.userId } });
      resolvedDriverId = driver?.id;
    }

    const seatCount = totalSeats ?? vehicle.capacity;

    // Generate a tracking token for public sharing
    const trackingToken = crypto.randomUUID();

    const journey = await prisma.journey.create({
      data: {
        routeId,
        vehicleId,
        driverId: resolvedDriverId,
        operatorId: route.operatorId,
        departureTime: new Date(departureTime),
        arrivalTime: arrivalTime ? new Date(arrivalTime) : null,
        price,
        totalSeats: seatCount,
        availableSeats: seatCount,
        status: 'SCHEDULED',
        trackingToken,
        busRegistration: vehicle.registrationPlate,
      },
      include: {
        route: { select: { fromCity: true, toCity: true, name: true } },
        operator: { select: { name: true } },
        vehicle: { select: { registrationPlate: true, make: true, model: true } },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: journey,
        message: 'Journey created successfully.',
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Journeys] Create error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create journey.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
