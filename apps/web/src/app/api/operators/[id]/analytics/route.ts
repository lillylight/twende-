import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

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

    // Verify access
    if (user.role !== 'RTSA_OFFICER' && user.role !== 'ADMIN' && user.userId !== id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') ?? 'weekly') as 'daily' | 'weekly' | 'monthly';
    const format = searchParams.get('format');
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    const now = new Date();
    let startDate: Date;
    const endDate: Date = endDateStr ? new Date(endDateStr) : now;

    if (startDateStr) {
      startDate = new Date(startDateStr);
    } else {
      // Default ranges based on period
      switch (period) {
        case 'daily':
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 30);
          break;
        case 'weekly':
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 12 * 7); // 12 weeks
          break;
        case 'monthly':
          startDate = new Date(now);
          startDate.setMonth(startDate.getMonth() - 12);
          break;
        default:
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 84);
      }
    }

    // Get all completed bookings in range for this operator
    const bookings = await prisma.booking.findMany({
      where: {
        journey: { operatorId: id },
        paymentStatus: 'PAID',
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        journey: {
          include: {
            route: { select: { id: true, fromCity: true, toCity: true } },
            driver: {
              select: {
                id: true,
                user: { select: { name: true } },
                rating: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Journey data for occupancy calculation
    const journeys = await prisma.journey.findMany({
      where: {
        operatorId: id,
        departureTime: { gte: startDate, lte: endDate },
        status: { in: ['COMPLETED', 'EN_ROUTE'] },
      },
      include: {
        route: { select: { id: true, fromCity: true, toCity: true } },
      },
    });

    // Build revenue trend
    const revenueTrend = buildRevenueTrend(bookings, period, startDate, endDate);

    // Build route performance
    const routeMap = new Map<
      string,
      {
        routeName: string;
        revenue: number;
        bookings: number;
        totalSeats: number;
        bookedSeats: number;
      }
    >();

    for (const booking of bookings) {
      const route = booking.journey.route;
      const key = route.id;
      const existing = routeMap.get(key) ?? {
        routeName: `${route.fromCity} \u2192 ${route.toCity}`,
        revenue: 0,
        bookings: 0,
        totalSeats: 0,
        bookedSeats: 0,
      };
      existing.revenue += Number(booking.price);
      existing.bookings += 1;
      routeMap.set(key, existing);
    }

    // Calculate occupancy per route from journeys
    for (const journey of journeys) {
      const key = journey.route.id;
      const existing = routeMap.get(key) ?? {
        routeName: `${journey.route.fromCity} \u2192 ${journey.route.toCity}`,
        revenue: 0,
        bookings: 0,
        totalSeats: 0,
        bookedSeats: 0,
      };
      existing.totalSeats += journey.totalSeats;
      existing.bookedSeats += journey.totalSeats - journey.availableSeats;
      routeMap.set(key, existing);
    }

    const routePerformance = Array.from(routeMap.entries())
      .map(([routeId, data]) => ({
        routeId,
        routeName: data.routeName,
        revenue: data.revenue,
        bookings: data.bookings,
        occupancyRate: data.totalSeats > 0 ? (data.bookedSeats / data.totalSeats) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Build occupancy rates
    const occupancyRates = routePerformance.map((r) => ({
      routeName: r.routeName,
      rate: r.occupancyRate,
    }));

    // Build top drivers
    const driverMap = new Map<
      string,
      { driverName: string; trips: number; rating: number; revenue: number }
    >();

    for (const booking of bookings) {
      const driver = booking.journey.driver;
      const key = driver.id;
      const existing = driverMap.get(key) ?? {
        driverName: driver.user.name,
        trips: 0,
        rating: Number(driver.rating),
        revenue: 0,
      };
      existing.revenue += Number(booking.price);
      existing.trips += 1;
      driverMap.set(key, existing);
    }

    const topDrivers = Array.from(driverMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Summary
    const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.price), 0);
    const totalBookings = bookings.length;
    const totalSeats = journeys.reduce((sum, j) => sum + j.totalSeats, 0);
    const totalBooked = journeys.reduce((sum, j) => sum + (j.totalSeats - j.availableSeats), 0);
    const averageOccupancy = totalSeats > 0 ? (totalBooked / totalSeats) * 100 : 0;
    const topRoute = routePerformance.length > 0 ? routePerformance[0].routeName : 'N/A';

    const analyticsData = {
      revenueTrend,
      routePerformance,
      occupancyRates,
      topDrivers,
      summary: {
        totalRevenue,
        totalBookings,
        averageOccupancy,
        topRoute,
      },
    };

    // Handle CSV export
    if (format === 'csv') {
      const csvRows: string[] = [
        'Period,Revenue,Bookings',
        ...revenueTrend.map((r) => `${r.period},${r.revenue},${r.bookings}`),
        '',
        'Route,Revenue,Bookings,Occupancy Rate',
        ...routePerformance.map(
          (r) => `"${r.routeName}",${r.revenue},${r.bookings},${r.occupancyRate.toFixed(1)}%`
        ),
        '',
        'Driver,Trips,Rating,Revenue',
        ...topDrivers.map(
          (d) => `"${d.driverName}",${d.trips},${d.rating.toFixed(1)},${d.revenue}`
        ),
      ];

      const csvContent = csvRows.join('\n');
      const filename = `operator-analytics-${period}-${new Date().toISOString().split('T')[0]}.csv`;

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: analyticsData,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Operator] Analytics error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to load analytics data.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Helper to build revenue trend based on period
function buildRevenueTrend(
  bookings: Array<{ price: unknown; createdAt: Date }>,
  period: 'daily' | 'weekly' | 'monthly',
  startDate: Date,
  endDate: Date
): Array<{ period: string; revenue: number; bookings: number }> {
  const buckets = new Map<string, { revenue: number; bookings: number }>();

  for (const booking of bookings) {
    const date = new Date(booking.createdAt);
    let key: string;

    switch (period) {
      case 'daily':
        key = date.toISOString().split('T')[0];
        break;
      case 'weekly': {
        const weekStart = new Date(date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        key = `W${weekStart.toISOString().split('T')[0]}`;
        break;
      }
      case 'monthly':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      default:
        key = date.toISOString().split('T')[0];
    }

    const existing = buckets.get(key) ?? { revenue: 0, bookings: 0 };
    existing.revenue += Number(booking.price);
    existing.bookings += 1;
    buckets.set(key, existing);
  }

  return Array.from(buckets.entries())
    .map(([period, data]) => ({
      period,
      revenue: Math.round(data.revenue * 100) / 100,
      bookings: data.bookings,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}
