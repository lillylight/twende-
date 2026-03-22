import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { verifyAuditChain, createAuditLog, AuditAction } from '@/lib/audit';

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

    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    if (!startDateStr || !endDateStr) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'startDate and endDate query parameters are required.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid date format.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const result = await verifyAuditChain(startDate, endDate);

    // Log the verification action
    await createAuditLog({
      userId: user.userId,
      userRole: user.role,
      action: AuditAction.AUDIT_VERIFY,
      resource: 'audit_log',
      details: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        result: result.valid ? 'PASSED' : 'FAILED',
        totalRecords: result.totalRecords,
      },
      request,
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[AuditLogs] Verify error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to verify audit chain.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
