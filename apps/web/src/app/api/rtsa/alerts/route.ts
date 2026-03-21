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
    const hoursBack = parseInt(searchParams.get('hours') ?? '24', 10);
    const severity = searchParams.get('severity');
    const resolved = searchParams.get('resolved');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '50', 10)));
    const skip = (page - 1) * pageSize;

    const since = new Date();
    since.setHours(since.getHours() - hoursBack);

    const where: Record<string, unknown> = {
      createdAt: { gte: since },
    };

    if (severity) {
      where.severity = severity;
    }

    if (resolved === 'true') {
      where.resolvedAt = { not: null };
    } else if (resolved === 'false') {
      where.resolvedAt = null;
    }

    const [alerts, totalItems] = await Promise.all([
      prisma.safetyAlert.findMany({
        where,
        include: {
          journey: {
            select: {
              id: true,
              route: { select: { fromCity: true, toCity: true } },
              vehicle: { select: { registrationPlate: true } },
            },
          },
          operator: {
            select: { id: true, name: true },
          },
        },
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      prisma.safetyAlert.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);

    // Summary stats
    const severityCounts = await prisma.safetyAlert.groupBy({
      by: ['severity'],
      where: { createdAt: { gte: since } },
      _count: { severity: true },
    });

    const summary: Record<string, number> = {};
    for (const entry of severityCounts) {
      summary[entry.severity] = entry._count.severity;
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          alerts,
          summary: {
            total: totalItems,
            bySeverity: summary,
            periodHours: hoursBack,
          },
        },
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
    console.error('[RTSA] Alerts list error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch alerts.' },
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

    const body = await request.json();
    const { alertId, resolution, notes } = body;

    if (!alertId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'alertId is required.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const alert = await prisma.safetyAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Alert not found.' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    if (alert.resolvedAt) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'ALREADY_RESOLVED', message: 'This alert has already been resolved.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const updated = await prisma.safetyAlert.update({
      where: { id: alertId },
      data: {
        resolvedAt: new Date(),
        resolvedBy: user.userId,
        resolution: resolution ?? 'Resolved by RTSA',
        notes: notes ?? null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          alertId: updated.id,
          resolvedAt: updated.resolvedAt,
          resolvedBy: user.userId,
          resolution: updated.resolution,
        },
        message: 'Alert resolved successfully.',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[RTSA] Alert resolve error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to resolve alert.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
