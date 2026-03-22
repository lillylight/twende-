import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { generateReconciliationReport } from '@/lib/payments/reconciliation';

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

    // Only RTSA officials, operators, and admins can access reconciliation reports
    const allowedRoles = ['RTSA_OFFICER', 'OPERATOR', 'OPERATOR_ADMIN', 'ADMIN'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only RTSA officials and operators can access reconciliation reports.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    let reportDate: Date;

    if (dateParam) {
      // Validate date format YYYY-MM-DD
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateParam)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Date must be in YYYY-MM-DD format.',
            },
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }

      reportDate = new Date(dateParam);

      if (isNaN(reportDate.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Invalid date provided.' },
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }
    } else {
      // Default to today
      reportDate = new Date();
    }

    // Don't allow future dates
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (reportDate > today) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Cannot generate reconciliation report for a future date.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const report = await generateReconciliationReport(reportDate);

    return NextResponse.json(
      {
        success: true,
        data: report,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Reconciliation] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to generate reconciliation report.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
