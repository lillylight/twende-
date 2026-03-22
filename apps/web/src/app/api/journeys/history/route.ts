import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

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

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const status = searchParams.get('status');
    const skip = (page - 1) * limit;

    // Build filters for bookings belonging to this user
    const where: Record<string, unknown> = {
      userId: user.userId,
    };

    // Filter by booking status
    if (status) {
      const validStatuses = ['COMPLETED', 'CANCELLED', 'CONFIRMED', 'CHECKED_IN', 'PENDING'];
      if (validStatuses.includes(status.toUpperCase())) {
        where.status = status.toUpperCase();
      }
    }

    // Date range filtering on the journey's departure time
    if (from || to) {
      const journeyFilter: Record<string, unknown> = {};
      if (from) {
        const fromDate = new Date(from);
        if (!isNaN(fromDate.getTime())) {
          journeyFilter.gte = fromDate;
        }
      }
      if (to) {
        const toDate = new Date(to);
        if (!isNaN(toDate.getTime())) {
          // End of day
          toDate.setHours(23, 59, 59, 999);
          journeyFilter.lte = toDate;
        }
      }
      if (Object.keys(journeyFilter).length > 0) {
        where.journey = {
          departureTime: journeyFilter,
        };
      }
    }

    // Fetch bookings with related journey data
    const [bookings, totalItems] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          journey: {
            include: {
              route: {
                select: { fromCity: true, toCity: true, distanceKm: true },
              },
              operator: {
                select: { name: true },
              },
              vehicle: {
                select: { registrationNumber: true },
              },
            },
          },
        },
        orderBy: { journey: { departureTime: 'desc' } },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    // Compute spending totals
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const completedBase = {
      userId: user.userId,
      status: 'COMPLETED' as const,
      paymentStatus: 'PAID' as const,
    };

    const [monthlySpend, yearlySpend, allTimeSpend] = await Promise.all([
      prisma.booking.aggregate({
        where: {
          ...completedBase,
          journey: { departureTime: { gte: startOfMonth } },
        },
        _sum: { price: true },
      }),
      prisma.booking.aggregate({
        where: {
          ...completedBase,
          journey: { departureTime: { gte: startOfYear } },
        },
        _sum: { price: true },
      }),
      prisma.booking.aggregate({
        where: completedBase,
        _sum: { price: true },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    // Shape the response
    const journeyHistory = bookings.map((booking) => ({
      bookingId: booking.id,
      reference: booking.reference,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      paymentMethod: booking.paymentMethod,
      seatNumber: booking.seatNumber,
      amount: Number(booking.price),
      passengerName: booking.passengerName,
      bookedAt: booking.createdAt,
      journey: {
        id: booking.journey.id,
        departureTime: booking.journey.departureTime,
        arrivalTime: booking.journey.arrivalTime,
        status: booking.journey.status,
        route: {
          origin: booking.journey.route.fromCity,
          destination: booking.journey.route.toCity,
          distanceKm: booking.journey.route.distanceKm,
        },
        operator: booking.journey.operator.name,
        vehicleRegistration:
          booking.journey.vehicle?.registrationNumber ?? booking.journey.busRegistration,
      },
    }));

    return NextResponse.json(
      {
        success: true,
        data: journeyHistory,
        spending: {
          thisMonth: Number(monthlySpend._sum.price ?? 0),
          thisYear: Number(yearlySpend._sum.price ?? 0),
          allTime: Number(allTimeSpend._sum.price ?? 0),
        },
        pagination: {
          page,
          pageSize: limit,
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
    console.error('[Journeys/History] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch journey history.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
