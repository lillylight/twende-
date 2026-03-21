import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const driver = await prisma.driver.findUnique({
      where: { id },
      select: {
        id: true,
        averageRating: true,
        totalRatings: true,
        totalTrips: true,
        user: {
          select: { firstName: true, lastName: true },
        },
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

    // Get rating breakdown
    const ratingBreakdown = await prisma.rating.groupBy({
      by: ['stars'],
      where: { driverId: id },
      _count: { stars: true },
    });

    const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const entry of ratingBreakdown) {
      breakdown[entry.stars] = entry._count.stars;
    }

    // Get average sub-ratings
    const subRatings = await prisma.rating.aggregate({
      where: { driverId: id },
      _avg: {
        safetyRating: true,
        cleanlinessRating: true,
        punctualityRating: true,
      },
    });

    // Get recent ratings
    const recentRatings = await prisma.rating.findMany({
      where: { driverId: id },
      select: {
        id: true,
        stars: true,
        comment: true,
        createdAt: true,
        journey: {
          select: {
            route: { select: { fromCity: true, toCity: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          driver: {
            id: driver.id,
            name: `${driver.user.firstName} ${driver.user.lastName}`,
            averageRating: driver.averageRating,
            totalRatings: driver.totalRatings,
            totalTrips: driver.totalTrips,
          },
          breakdown,
          subRatings: {
            safety: subRatings._avg.safetyRating
              ? Math.round(subRatings._avg.safetyRating * 10) / 10
              : null,
            cleanliness: subRatings._avg.cleanlinessRating
              ? Math.round(subRatings._avg.cleanlinessRating * 10) / 10
              : null,
            punctuality: subRatings._avg.punctualityRating
              ? Math.round(subRatings._avg.punctualityRating * 10) / 10
              : null,
          },
          recentRatings,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Drivers] Rating fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch driver ratings.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
