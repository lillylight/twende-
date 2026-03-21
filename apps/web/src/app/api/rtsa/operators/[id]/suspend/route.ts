import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { addSMSJob } from '@/lib/queues/sms.queue';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;
    const body = await request.json();
    const { reason, suspend } = body;

    const operator = await prisma.operator.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        contactPhone: true,
        contactEmail: true,
        isSuspended: true,
      },
    });

    if (!operator) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Operator not found.' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Default to suspend if not specified; pass suspend: false to unsuspend
    const shouldSuspend = suspend !== false;

    if (shouldSuspend && operator.isSuspended) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'ALREADY_SUSPENDED', message: 'Operator is already suspended.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    if (!shouldSuspend && !operator.isSuspended) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_SUSPENDED', message: 'Operator is not currently suspended.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Update operator suspension status
    await prisma.operator.update({
      where: { id },
      data: {
        isSuspended: shouldSuspend,
        suspendedAt: shouldSuspend ? new Date() : null,
        suspendedBy: shouldSuspend ? user.userId : null,
        suspensionReason: shouldSuspend ? (reason ?? 'Suspended by RTSA') : null,
      },
    });

    // If suspending, cancel all scheduled journeys
    if (shouldSuspend) {
      await prisma.journey.updateMany({
        where: {
          operatorId: id,
          status: 'SCHEDULED',
        },
        data: { status: 'CANCELLED' },
      });

      // Notify the operator
      if (operator.contactPhone) {
        await addSMSJob(
          operator.contactPhone,
          `[ZedPulse RTSA] Your operator licence has been suspended. Reason: ${reason ?? 'Compliance violation'}. All scheduled journeys have been cancelled. Contact RTSA for details.`
        );
      }
    } else {
      // Unsuspending
      if (operator.contactPhone) {
        await addSMSJob(
          operator.contactPhone,
          `[ZedPulse RTSA] Your operator licence suspension has been lifted. You may resume operations.`
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          operatorId: id,
          name: operator.name,
          isSuspended: shouldSuspend,
          reason: shouldSuspend ? (reason ?? 'Suspended by RTSA') : null,
          action: shouldSuspend ? 'suspended' : 'unsuspended',
        },
        message: shouldSuspend
          ? `Operator ${operator.name} has been suspended.`
          : `Operator ${operator.name} suspension has been lifted.`,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[RTSA] Operator suspend error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update operator status.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
