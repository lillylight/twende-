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
    const days = parseInt(searchParams.get('days') ?? '30', 10);

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get all active routes with their safety data
    const routes = await prisma.route.findMany({
      where: { isActive: true },
      include: {
        operator: { select: { name: true } },
        journeys: {
          where: { departureTime: { gte: since } },
          select: {
            id: true,
            status: true,
            safetyAlerts: {
              select: {
                id: true,
                alertType: true,
                severity: true,
                data: true,
                createdAt: true,
              },
            },
            sosEvents: {
              select: { id: true },
            },
          },
        },
      },
    });

    const riskData = routes.map((route) => {
      let totalAlerts = 0;
      let criticalAlerts = 0;
      let speedingAlerts = 0;
      let deviationAlerts = 0;
      let sosCount = 0;
      const alertLocations: Array<{ lat: number; lng: number; type: string; severity: string }> =
        [];

      for (const journey of route.journeys) {
        for (const alert of journey.safetyAlerts) {
          totalAlerts++;
          if (alert.severity === 'CRITICAL') criticalAlerts++;
          if (alert.alertType === 'SPEEDING') speedingAlerts++;
          if (alert.alertType === 'ROUTE_DEVIATION') deviationAlerts++;

          const data = alert.data as Record<string, unknown> | null;
          if (data && typeof data.lat === 'number' && typeof data.lng === 'number') {
            alertLocations.push({
              lat: data.lat,
              lng: data.lng,
              type: alert.alertType,
              severity: alert.severity,
            });
          }
        }
        sosCount += journey.sosEvents.length;
      }

      const journeyCount = route.journeys.length;
      const completedCount = route.journeys.filter((j) => j.status === 'COMPLETED').length;

      // Calculate risk score (0-10, higher = more risky)
      let riskScore = 0;
      if (journeyCount > 0) {
        riskScore += Math.min((totalAlerts / journeyCount) * 3, 3);
        riskScore += Math.min(criticalAlerts * 1.5, 3);
        riskScore += Math.min(sosCount * 2, 4);
      }
      riskScore = Math.min(10, Math.round(riskScore * 10) / 10);

      return {
        routeId: route.id,
        routeName: route.name,
        fromCity: route.fromCity,
        toCity: route.toCity,
        distanceKm: route.distanceKm,
        operator: route.operator.name,
        stats: {
          journeyCount,
          completedCount,
          totalAlerts,
          criticalAlerts,
          speedingAlerts,
          deviationAlerts,
          sosCount,
        },
        riskScore,
        riskLevel: riskScore >= 7 ? 'HIGH' : riskScore >= 4 ? 'MEDIUM' : 'LOW',
        heatmapPoints: alertLocations,
      };
    });

    // Sort by risk score descending
    riskData.sort((a, b) => b.riskScore - a.riskScore);

    return NextResponse.json(
      {
        success: true,
        data: {
          periodDays: days,
          routes: riskData,
          summary: {
            totalRoutes: riskData.length,
            highRisk: riskData.filter((r) => r.riskLevel === 'HIGH').length,
            mediumRisk: riskData.filter((r) => r.riskLevel === 'MEDIUM').length,
            lowRisk: riskData.filter((r) => r.riskLevel === 'LOW').length,
          },
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[RTSA] Route risk heatmap error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to generate route risk data.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
