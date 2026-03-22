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

    // Verify the user has access to this operator's data
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

    const operator = await prisma.operator.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        complianceScore: true,
        isActive: true,
      },
    });

    if (!operator) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Operator not found.' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Revenue calculations - sum of paid bookings for this operator's journeys
    const [revenueToday, revenueThisWeek, revenueThisMonth] = await Promise.all([
      prisma.booking.aggregate({
        where: {
          journey: { operatorId: id },
          paymentStatus: 'PAID',
          createdAt: { gte: startOfDay },
        },
        _sum: { price: true },
      }),
      prisma.booking.aggregate({
        where: {
          journey: { operatorId: id },
          paymentStatus: 'PAID',
          createdAt: { gte: startOfWeek },
        },
        _sum: { price: true },
      }),
      prisma.booking.aggregate({
        where: {
          journey: { operatorId: id },
          paymentStatus: 'PAID',
          createdAt: { gte: startOfMonth },
        },
        _sum: { price: true },
      }),
    ]);

    // Stats
    const [totalBookings, activeJourneys, fleetSize] = await Promise.all([
      prisma.booking.count({
        where: {
          journey: { operatorId: id },
          status: { in: ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'] },
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.journey.count({
        where: {
          operatorId: id,
          status: { in: ['BOARDING', 'EN_ROUTE'] },
        },
      }),
      prisma.vehicle.count({
        where: { operatorId: id, isActive: true },
      }),
    ]);

    // Upcoming journeys
    const upcomingJourneys = await prisma.journey.findMany({
      where: {
        operatorId: id,
        status: { in: ['SCHEDULED', 'BOARDING'] },
        departureTime: { gte: now },
      },
      include: {
        route: { select: { fromCity: true, toCity: true } },
        driver: {
          select: {
            user: { select: { name: true } },
          },
        },
        vehicle: { select: { registrationNumber: true } },
      },
      orderBy: { departureTime: 'asc' },
      take: 10,
    });

    // Recent alerts for this operator
    const recentAlerts = await prisma.safetyAlert.findMany({
      where: { operatorId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        alertType: true,
        severity: true,
        data: true,
        createdAt: true,
        resolved: true,
      },
    });

    // Check if request wants drivers included
    const { searchParams } = new URL(request.url);
    const includeDrivers = searchParams.get('include') === 'drivers';

    let drivers: unknown[] = [];
    if (includeDrivers) {
      drivers = await prisma.driver.findMany({
        where: { operatorId: id },
        include: {
          user: {
            select: { firstName: true, lastName: true, phone: true },
          },
        },
        orderBy: { rating: 'asc' },
      });
    }

    const responseData: Record<string, unknown> = {
      revenue: {
        today: Number(revenueToday._sum.price ?? 0),
        thisWeek: Number(revenueThisWeek._sum.price ?? 0),
        thisMonth: Number(revenueThisMonth._sum.price ?? 0),
      },
      stats: {
        totalBookings,
        activeJourneys,
        fleetSize,
        complianceScore: Number(operator.complianceScore),
      },
      upcomingJourneys: upcomingJourneys.map((j) => ({
        id: j.id,
        route: `${j.route.fromCity} \u2192 ${j.route.toCity}`,
        departureTime: j.departureTime.toISOString(),
        driverName: j.driver.user.name,
        vehicleReg: j.vehicle?.registrationNumber ?? 'N/A',
        seatsBooked: j.totalSeats - j.availableSeats,
        totalSeats: j.totalSeats,
        status: j.status,
      })),
      recentAlerts,
    };

    if (includeDrivers) {
      responseData.drivers = drivers;
    }

    return NextResponse.json(
      {
        success: true,
        data: responseData,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Operator] Dashboard error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to load dashboard data.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
