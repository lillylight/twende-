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

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));
    const skip = (page - 1) * pageSize;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [operators, totalItems] = await Promise.all([
      prisma.operator.findMany({
        include: {
          _count: {
            select: {
              vehicles: true,
              drivers: true,
              routes: true,
              journeys: true,
            },
          },
          safetyAlerts: {
            where: { createdAt: { gte: thirtyDaysAgo } },
            select: { id: true, severity: true },
          },
        },
        orderBy: { complianceScore: 'asc' }, // Worst-first
        skip,
        take: pageSize,
      }),
      prisma.operator.count(),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);

    const data = operators.map((op) => {
      const criticalAlerts = op.safetyAlerts.filter((a) => a.severity === 'CRITICAL').length;
      const totalAlerts = op.safetyAlerts.length;

      return {
        id: op.id,
        name: op.name,
        contactPhone: op.contactPhone,
        contactEmail: op.contactEmail,
        complianceScore: op.complianceScore,
        isSuspended: op.isSuspended,
        fleetSize: op._count.vehicles,
        driverCount: op._count.drivers,
        routeCount: op._count.routes,
        journeyCount: op._count.journeys,
        alertsLast30Days: totalAlerts,
        criticalAlertsLast30Days: criticalAlerts,
        riskLevel:
          op.complianceScore >= 7.0 ? 'LOW' : op.complianceScore >= 4.0 ? 'MEDIUM' : 'HIGH',
        createdAt: op.createdAt,
      };
    });

    return NextResponse.json(
      {
        success: true,
        data,
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
    console.error('[RTSA] Operators list error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch operators.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
