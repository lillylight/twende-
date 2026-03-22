import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

/**
 * POST /api/tracking/detours
 * Create a planned detour for a journey. Only drivers can create detours.
 */
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

    if (user.role !== 'DRIVER') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only drivers can create planned detours.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { journeyId, reason, startLat, startLng, endLat, endLng, radiusMeters, expiresAt } = body;

    // Validate required fields
    if (
      !journeyId ||
      !reason ||
      startLat === undefined ||
      startLng === undefined ||
      endLat === undefined ||
      endLng === undefined ||
      !expiresAt
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message:
              'journeyId, reason, startLat, startLng, endLat, endLng, and expiresAt are required.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Verify journey exists and belongs to the driver
    const journey = await prisma.journey.findUnique({
      where: { id: journeyId },
      include: { driver: { select: { userId: true } } },
    });

    if (!journey) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Journey not found.' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    if (journey.driver.userId !== user.userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only create detours for your own journeys.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const expiresAtDate = new Date(expiresAt);
    if (isNaN(expiresAtDate.getTime()) || expiresAtDate <= new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'expiresAt must be a valid future date.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const detour = await prisma.plannedDetour.create({
      data: {
        journeyId,
        reason,
        startLat,
        startLng,
        endLat,
        endLng,
        radiusMeters: radiusMeters ?? 2000,
        expiresAt: expiresAtDate,
      },
    });

    console.log(`[Detours] Created detour ${detour.id} for journey ${journeyId}: ${reason}`);

    return NextResponse.json(
      {
        success: true,
        data: detour,
        message: 'Planned detour created successfully.',
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Detours] Create error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create planned detour.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tracking/detours?journeyId=<id>
 * List active detours for a journey.
 */
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

    const { searchParams } = new URL(request.url);
    const journeyId = searchParams.get('journeyId');

    if (!journeyId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'journeyId query parameter is required.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const now = new Date();

    const detours = await prisma.plannedDetour.findMany({
      where: {
        journeyId,
        isActive: true,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      {
        success: true,
        data: detours,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Detours] List error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list detours.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
