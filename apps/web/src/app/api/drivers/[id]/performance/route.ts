import { NextRequest, NextResponse } from 'next/server';
import { getDriverPerformanceReport } from '@/lib/driver-performance';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const report = await getDriverPerformanceReport(id);

    if (!report) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Driver not found.' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          driverId: report.driverId,
          driverName: report.driverName,
          operatorId: report.operatorId,
          scores: {
            overall: report.scores.overallScore,
            safety: report.scores.safetyScore,
            onTime: report.scores.onTimeScore,
            rating: report.scores.ratingScore,
          },
          details: report.details,
          recentViolations: report.recentViolations,
          recentRatings: report.recentRatings,
          recommendations: report.recommendations,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Drivers] Performance error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch driver performance.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
