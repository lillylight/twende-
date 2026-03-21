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

    const { id } = await params;

    const operator = await prisma.operator.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        complianceScore: true,
        isSuspended: true,
        contactPhone: true,
        contactEmail: true,
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

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));
    const skip = (page - 1) * pageSize;

    // Get journey history
    const [journeys, journeyCount] = await Promise.all([
      prisma.journey.findMany({
        where: { operatorId: id },
        include: {
          route: { select: { fromCity: true, toCity: true } },
          vehicle: { select: { registrationPlate: true } },
          driver: {
            select: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { departureTime: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.journey.count({ where: { operatorId: id } }),
    ]);

    // Get safety alerts for this operator
    const safetyAlerts = await prisma.safetyAlert.findMany({
      where: { operatorId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Get SOS events related to this operator's journeys
    const sosEvents = await prisma.sosEvent.findMany({
      where: { journey: { operatorId: id } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Get rating stats
    const ratingStats = await prisma.rating.aggregate({
      where: { operatorId: id },
      _avg: { stars: true },
      _count: { stars: true },
    });

    const totalPages = Math.ceil(journeyCount / pageSize);

    return NextResponse.json(
      {
        success: true,
        data: {
          operator,
          stats: {
            totalJourneys: journeyCount,
            averageRating: ratingStats._avg.stars
              ? Math.round(ratingStats._avg.stars * 10) / 10
              : null,
            totalRatings: ratingStats._count.stars,
            totalAlerts: safetyAlerts.length,
            totalSOSEvents: sosEvents.length,
          },
          journeys,
          safetyAlerts,
          sosEvents,
        },
        pagination: {
          page,
          pageSize,
          totalItems: journeyCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[RTSA] Operator history error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch operator history.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
