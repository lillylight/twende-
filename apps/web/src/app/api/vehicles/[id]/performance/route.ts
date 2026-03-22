import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        operator: { select: { id: true, name: true } },
      },
    });

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

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get journey stats
    const [totalJourneys, completedJourneys, recentJourneys] = await Promise.all([
      prisma.journey.count({ where: { vehicleId: id } }),
      prisma.journey.count({ where: { vehicleId: id, status: 'COMPLETED' } }),
      prisma.journey.count({
        where: { vehicleId: id, createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    // Safety violations in last 30 days
    const recentViolations = await prisma.safetyAlert.findMany({
      where: {
        journey: { vehicleId: id },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        id: true,
        alertType: true,
        severity: true,
        createdAt: true,
        resolved: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const violationCount = recentViolations.length;
    const flaggedForInspection = violationCount >= 5;

    // Calculate utilization rate (journeys per day in last 30 days)
    const daysActive = 30;
    const utilizationRate = recentJourneys / daysActive;

    // Distance traveled in last 30 days (sum from GPS logs)
    const recentDistance = await prisma.gPSLog.aggregate({
      where: {
        journey: { vehicleId: id },
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
    });

    // Violation breakdown by type
    const violationsByType: Record<string, number> = {};
    for (const v of recentViolations) {
      violationsByType[v.alertType] = (violationsByType[v.alertType] ?? 0) + 1;
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          vehicle: {
            id: vehicle.id,
            registrationNumber: vehicle.registrationNumber,
            operator: vehicle.operator,
            vehicleType: vehicle.vehicleType,
            capacity: vehicle.capacity,
          },
          performance: {
            totalJourneys,
            completedJourneys,
            recentJourneys30d: recentJourneys,
            totalDistanceKm: vehicle.totalDistanceKm,
            utilizationRate: Math.round(utilizationRate * 100) / 100,
            gpsLogCount30d: recentDistance._count.id,
          },
          safety: {
            violationCount30d: violationCount,
            flaggedForInspection,
            violationsByType,
            recentViolations: recentViolations.slice(0, 10),
          },
          maintenance: {
            lastMaintenanceDate: vehicle.lastMaintenanceDate,
            daysSinceLastMaintenance: vehicle.lastMaintenanceDate
              ? Math.floor(
                  (Date.now() - vehicle.lastMaintenanceDate.getTime()) / (24 * 60 * 60 * 1000)
                )
              : null,
          },
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Vehicles] Performance error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch vehicle performance.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
