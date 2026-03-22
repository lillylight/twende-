import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { searchAuditLogs, verifyAuditChain } from '@/lib/audit';

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

    const userId = searchParams.get('userId') ?? undefined;
    const action = searchParams.get('action') ?? undefined;
    const resource = searchParams.get('resource') ?? undefined;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    const result = await searchAuditLogs({
      userId,
      action,
      resource,
      startDate,
      endDate,
      page,
      limit,
    });

    // Run a quick chain verification on the returned date range
    let chainStatus: { valid: boolean } = { valid: true };
    if (startDate && endDate) {
      chainStatus = await verifyAuditChain(startDate, endDate);
    }

    return NextResponse.json(
      {
        success: true,
        data: result.logs,
        pagination: result.pagination,
        chainIntegrity: chainStatus,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[AuditLogs] Search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to search audit logs.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
