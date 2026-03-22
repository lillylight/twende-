import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        operator: { select: { id: true, name: true } },
        _count: { select: { journeys: true } },
      },
    });

    if (!vehicle) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Vehicle not found.' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Get journey stats
    const completedJourneys = await prisma.journey.count({
      where: { vehicleId: id, status: 'COMPLETED' },
    });

    const recentAlerts = await prisma.safetyAlert.count({
      where: {
        journey: { vehicleId: id },
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: vehicle.id,
          registrationNumber: vehicle.registrationNumber,
          operatorId: vehicle.operatorId,
          operator: vehicle.operator,
          capacity: vehicle.capacity,
          vehicleType: vehicle.vehicleType,
          isWheelchairAccessible: vehicle.isWheelchairAccessible,
          isActive: vehicle.isActive,
          totalDistanceKm: vehicle.totalDistanceKm,
          journeyCount: vehicle.journeyCount,
          lastMaintenanceDate: vehicle.lastMaintenanceDate,
          createdAt: vehicle.createdAt,
          updatedAt: vehicle.updatedAt,
          stats: {
            totalJourneys: vehicle._count.journeys,
            completedJourneys,
            recentAlerts30d: recentAlerts,
          },
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Vehicles] Get error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch vehicle.' },
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
          error: { code: 'FORBIDDEN', message: 'Only operators can manage vehicles.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.vehicle.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Vehicle not found.' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // If updating registration number, check uniqueness
    if (body.registrationNumber && body.registrationNumber !== existing.registrationNumber) {
      const duplicate = await prisma.vehicle.findUnique({
        where: { registrationNumber: body.registrationNumber },
      });
      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'DUPLICATE',
              message: `Vehicle with registration ${body.registrationNumber} already exists.`,
            },
            timestamp: new Date().toISOString(),
          },
          { status: 409 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};

    if (body.registrationNumber !== undefined) {
      updateData.registrationNumber = body.registrationNumber.toUpperCase().trim();
    }
    if (body.capacity !== undefined) {
      updateData.capacity = parseInt(body.capacity, 10);
    }
    if (body.vehicleType !== undefined) {
      updateData.vehicleType = body.vehicleType;
    }
    if (body.isWheelchairAccessible !== undefined) {
      updateData.isWheelchairAccessible = body.isWheelchairAccessible;
    }
    if (body.lastMaintenanceDate !== undefined) {
      updateData.lastMaintenanceDate = body.lastMaintenanceDate
        ? new Date(body.lastMaintenanceDate)
        : null;
    }
    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive;
    }

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: updateData,
      include: {
        operator: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: vehicle,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Vehicles] Update error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update vehicle.' },
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
          error: { code: 'FORBIDDEN', message: 'Only operators can manage vehicles.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existing = await prisma.vehicle.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Vehicle not found.' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Soft delete
    await prisma.vehicle.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json(
      {
        success: true,
        data: { message: 'Vehicle deactivated successfully.' },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Vehicles] Delete error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete vehicle.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
