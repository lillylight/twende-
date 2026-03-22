import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { exportAuditLogs, createAuditLog, AuditAction } from '@/lib/audit';

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

    const format = (searchParams.get('format') ?? 'json') as 'json' | 'csv';
    if (format !== 'json' && format !== 'csv') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Format must be "json" or "csv".' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const userId = searchParams.get('userId') ?? undefined;
    const action = searchParams.get('action') ?? undefined;
    const resource = searchParams.get('resource') ?? undefined;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    const content = await exportAuditLogs({ userId, action, resource, startDate, endDate }, format);

    // Log the export action itself
    await createAuditLog({
      userId: user.userId,
      userRole: user.role,
      action: AuditAction.AUDIT_EXPORT,
      resource: 'audit_log',
      details: { format, filters: { userId, action, resource, startDate, endDate } },
      request,
    });

    const contentType = format === 'csv' ? 'text/csv' : 'application/json';
    const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[AuditLogs] Export error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to export audit logs.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
