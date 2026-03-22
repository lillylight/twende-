import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const route = await prisma.route.findUnique({
      where: { id },
      include: {
        _count: { select: { journeys: true } },
        journeys: {
          where: { status: 'SCHEDULED', departureTime: { gte: new Date() } },
          select: {
            id: true,
            departureTime: true,
            availableSeats: true,
            totalSeats: true,
            price: true,
            status: true,
            operator: { select: { id: true, name: true } },
          },
          orderBy: { departureTime: 'asc' },
          take: 10,
        },
      },
    });

    if (!route) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Route not found.' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: route.id,
          fromCity: route.fromCity,
          toCity: route.toCity,
          distanceKm: route.distanceKm,
          estimatedDurationMinutes: route.estimatedDurationMinutes,
          waypoints: route.waypoints,
          isActive: route.isActive,
          createdAt: route.createdAt,
          journeyCount: route._count.journeys,
          upcomingJourneys: route.journeys,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Routes] Get error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch route.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getCurrentUser(request);

    if (!auth) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    if (auth.role !== 'OPERATOR_ADMIN' && auth.role !== 'RTSA_OFFICIAL') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only operators can update routes.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.route.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Route not found.' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.fromCity !== undefined) updateData.fromCity = body.fromCity.trim();
    if (body.toCity !== undefined) updateData.toCity = body.toCity.trim();
    if (body.distanceKm !== undefined) updateData.distanceKm = parseInt(body.distanceKm, 10);
    if (body.estimatedDurationMinutes !== undefined) {
      updateData.estimatedDurationMinutes = parseInt(body.estimatedDurationMinutes, 10);
    }
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    if (body.waypoints !== undefined) {
      if (body.waypoints !== null && !Array.isArray(body.waypoints)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'waypoints must be an array or null.',
            },
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }
      updateData.waypoints = body.waypoints ? JSON.stringify(body.waypoints) : '[]';
    }

    // Prevent same from/to
    const finalFrom = (updateData.fromCity as string) ?? existing.fromCity;
    const finalTo = (updateData.toCity as string) ?? existing.toCity;
    if (finalFrom === finalTo) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Departure and destination cities cannot be the same.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const route = await prisma.route.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(
      {
        success: true,
        data: route,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Routes] Update error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update route.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getCurrentUser(request);

    if (!auth) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    if (auth.role !== 'OPERATOR_ADMIN' && auth.role !== 'RTSA_OFFICIAL') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only operators can manage routes.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existing = await prisma.route.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Route not found.' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Soft delete
    await prisma.route.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json(
      {
        success: true,
        data: { message: 'Route deactivated successfully.' },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Routes] Delete error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete route.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
