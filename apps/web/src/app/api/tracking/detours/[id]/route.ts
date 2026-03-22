import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

/**
 * PUT /api/tracking/detours/[id]
 * Update a planned detour (e.g. deactivate it).
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    if (user.role !== 'DRIVER' && user.role !== 'OPERATOR_ADMIN' && user.role !== 'RTSA_OFFICIAL') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Insufficient permissions to update detours.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const detour = await prisma.plannedDetour.findUnique({
      where: { id },
      include: { journey: { include: { driver: { select: { userId: true } } } } },
    });

    if (!detour) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Detour not found.' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Drivers can only update their own detours
    if (user.role === 'DRIVER' && detour.journey.driver.userId !== user.userId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'You can only update your own detours.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive;
    }

    if (body.reason !== undefined) {
      updateData.reason = body.reason;
    }

    if (body.radiusMeters !== undefined) {
      updateData.radiusMeters = body.radiusMeters;
    }

    if (body.expiresAt !== undefined) {
      const expiresAtDate = new Date(body.expiresAt);
      if (isNaN(expiresAtDate.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'expiresAt must be a valid date.' },
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }
      updateData.expiresAt = expiresAtDate;
    }

    const updated = await prisma.plannedDetour.update({
      where: { id },
      data: updateData,
    });

    console.log(`[Detours] Updated detour ${id}: ${JSON.stringify(updateData)}`);

    return NextResponse.json(
      {
        success: true,
        data: updated,
        message: 'Detour updated successfully.',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Detours] Update error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update detour.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tracking/detours/[id]
 * Remove a planned detour.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    if (user.role !== 'DRIVER' && user.role !== 'OPERATOR_ADMIN' && user.role !== 'RTSA_OFFICIAL') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Insufficient permissions to delete detours.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    const detour = await prisma.plannedDetour.findUnique({
      where: { id },
      include: { journey: { include: { driver: { select: { userId: true } } } } },
    });

    if (!detour) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Detour not found.' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Drivers can only delete their own detours
    if (user.role === 'DRIVER' && detour.journey.driver.userId !== user.userId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'You can only delete your own detours.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    await prisma.plannedDetour.delete({
      where: { id },
    });

    console.log(`[Detours] Deleted detour ${id} for journey ${detour.journeyId}`);

    return NextResponse.json(
      {
        success: true,
        data: { deleted: true, id },
        message: 'Detour deleted successfully.',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Detours] Delete error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete detour.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
