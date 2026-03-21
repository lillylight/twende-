import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));
    const skip = (page - 1) * pageSize;

    const [routes, totalItems] = await Promise.all([
      prisma.route.findMany({
        where: { isActive: true },
        include: {
          operator: {
            select: { id: true, name: true, complianceScore: true },
          },
          _count: {
            select: { journeys: true },
          },
        },
        orderBy: { fromCity: 'asc' },
        skip,
        take: pageSize,
      }),
      prisma.route.count({ where: { isActive: true } }),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);

    return NextResponse.json(
      {
        success: true,
        data: routes.map((route) => ({
          id: route.id,
          name: route.name,
          fromCity: route.fromCity,
          toCity: route.toCity,
          distanceKm: route.distanceKm,
          estimatedDurationMinutes: route.estimatedDurationMinutes,
          basePrice: route.basePrice,
          isActive: route.isActive,
          operator: route.operator,
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
