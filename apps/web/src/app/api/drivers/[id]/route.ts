import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { calculateDriverScore } from '@/lib/driver-performance';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const driver = await prisma.driver.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true, nrc: true } },
        operator: { select: { id: true, name: true } },
        _count: { select: { journeys: true, ratings: true } },
      },
    });

    if (!driver) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Driver not found.' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    const scores = await calculateDriverScore(id);

    // Get recent journeys
    const recentJourneys = await prisma.journey.findMany({
      where: { driverId: id },
      select: {
        id: true,
        status: true,
        departureTime: true,
        arrivalTime: true,
        route: { select: { fromCity: true, toCity: true } },
      },
      orderBy: { departureTime: 'desc' },
      take: 5,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: driver.id,
          userId: driver.userId,
          user: driver.user,
          operatorId: driver.operatorId,
          operator: driver.operator,
          licenceNumber: driver.licenceNumber,
          licenceExpiry: driver.licenceExpiry,
          rating: driver.rating,
          totalTrips: driver.totalTrips,
          isActive: driver.isActive,
          createdAt: driver.createdAt,
          journeyCount: driver._count.journeys,
          ratingCount: driver._count.ratings,
          performanceScore: scores.overallScore,
          performanceBreakdown: {
            safety: scores.safetyScore,
            onTime: scores.onTimeScore,
            rating: scores.ratingScore,
          },
          recentJourneys,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Drivers] Get error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch driver.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
          error: { code: 'FORBIDDEN', message: 'Only operators can update drivers.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.driver.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Driver not found.' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Update driver fields
    const driverUpdate: Record<string, unknown> = {};
    if (body.licenceNumber !== undefined) driverUpdate.licenceNumber = body.licenceNumber.trim();
    if (body.licenceExpiry !== undefined) driverUpdate.licenceExpiry = new Date(body.licenceExpiry);
    if (body.isActive !== undefined) driverUpdate.isActive = body.isActive;

    // Update user fields (name, nrc)
    const userUpdate: Record<string, unknown> = {};
    if (body.name !== undefined) userUpdate.name = body.name.trim();
    if (body.nrc !== undefined) userUpdate.nrc = body.nrc;
    if (body.email !== undefined) userUpdate.email = body.email;

    // Execute updates in transaction
    const [driver] = await prisma.$transaction([
      prisma.driver.update({
        where: { id },
        data: driverUpdate,
        include: {
          user: { select: { id: true, name: true, phone: true, email: true } },
          operator: { select: { id: true, name: true } },
        },
      }),
      ...(Object.keys(userUpdate).length > 0
        ? [prisma.user.update({ where: { id: existing.userId }, data: userUpdate })]
        : []),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: driver,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Drivers] Update error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update driver.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
          error: { code: 'FORBIDDEN', message: 'Only operators can deactivate drivers.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existing = await prisma.driver.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Driver not found.' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Check for active journeys
    const activeJourneys = await prisma.journey.count({
      where: {
        driverId: id,
        status: { in: ['SCHEDULED', 'BOARDING', 'EN_ROUTE'] },
      },
    });

    if (activeJourneys > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONFLICT',
            message: `Cannot deactivate driver with ${activeJourneys} active journey(s). Reassign or complete them first.`,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 409 }
      );
    }

    // Soft delete: deactivate the driver and user account
    await prisma.$transaction([
      prisma.driver.update({ where: { id }, data: { isActive: false } }),
      prisma.user.update({ where: { id: existing.userId }, data: { isActive: false } }),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: { message: 'Driver deactivated successfully.' },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Drivers] Delete error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to deactivate driver.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
