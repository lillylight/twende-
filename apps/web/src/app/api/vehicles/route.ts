import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));
    const skip = (page - 1) * pageSize;

    const operatorId = searchParams.get('operatorId');
    const isActive = searchParams.get('isActive');
    const isWheelchairAccessible = searchParams.get('isWheelchairAccessible');
    const vehicleType = searchParams.get('vehicleType');

    const where: Record<string, unknown> = {};

    if (operatorId) {
      where.operatorId = operatorId;
    }
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true';
    }
    if (isWheelchairAccessible === 'true') {
      where.isWheelchairAccessible = true;
    }
    if (vehicleType) {
      where.vehicleType = vehicleType;
    }

    const [vehicles, totalItems] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        include: {
          operator: { select: { id: true, name: true } },
          _count: { select: { journeys: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.vehicle.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);

    return NextResponse.json(
      {
        success: true,
        data: vehicles.map((v) => ({
          id: v.id,
          registrationNumber: v.registrationNumber,
          operatorId: v.operatorId,
          operator: v.operator,
          capacity: v.capacity,
          vehicleType: v.vehicleType,
          isWheelchairAccessible: v.isWheelchairAccessible,
          isActive: v.isActive,
          totalDistanceKm: v.totalDistanceKm,
          journeyCount: v.journeyCount,
          lastMaintenanceDate: v.lastMaintenanceDate,
          actualJourneyCount: v._count.journeys,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
        })),
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Vehicles] List error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch vehicles.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      registrationNumber,
      operatorId,
      capacity,
      vehicleType,
      isWheelchairAccessible,
      lastMaintenanceDate,
    } = body;

    if (!registrationNumber || !operatorId || !capacity) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'registrationNumber, operatorId, and capacity are required.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Check unique registration
    const existing = await prisma.vehicle.findUnique({
      where: { registrationNumber },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE',
            message: `Vehicle with registration ${registrationNumber} already exists.`,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 409 }
      );
    }

    // Verify operator exists
    const operator = await prisma.operator.findUnique({
      where: { id: operatorId },
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

    const vehicle = await prisma.vehicle.create({
      data: {
        registrationNumber: registrationNumber.toUpperCase().trim(),
        operatorId,
        capacity: parseInt(capacity, 10),
        vehicleType: vehicleType ?? 'BUS',
        isWheelchairAccessible: isWheelchairAccessible ?? false,
        lastMaintenanceDate: lastMaintenanceDate ? new Date(lastMaintenanceDate) : null,
      },
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
      { status: 201 }
    );
  } catch (error) {
    console.error('[Vehicles] Create error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create vehicle.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
