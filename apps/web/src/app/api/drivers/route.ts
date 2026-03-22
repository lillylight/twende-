import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { formatZambianPhone } from '@/lib/utils';
import { calculateDriverScore } from '@/lib/driver-performance';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));
    const skip = (page - 1) * pageSize;

    const operatorId = searchParams.get('operatorId');
    const isActive = searchParams.get('isActive');
    const includePerformance = searchParams.get('includePerformance') === 'true';

    const where: Record<string, unknown> = {};
    if (operatorId) where.operatorId = operatorId;
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    const [drivers, totalItems] = await Promise.all([
      prisma.driver.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, phone: true, email: true } },
          operator: { select: { id: true, name: true } },
          _count: { select: { journeys: true, ratings: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.driver.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);

    // Optionally include performance scores
    const data = await Promise.all(
      drivers.map(async (driver) => {
        const base = {
          id: driver.id,
          userId: driver.userId,
          user: driver.user,
          operatorId: driver.operatorId,
          operator: driver.operator,
          licenceNumber: driver.licenceNumber,
          licenceExpiry: driver.licenceExpiry,
          rating: driver.rating,
          totalTrips: driver.totalTrips,
          isActive: driver.isActive,
          createdAt: driver.createdAt,
          journeyCount: driver._count.journeys,
          ratingCount: driver._count.ratings,
          performanceScore: null as number | null,
        };

        if (includePerformance) {
          const scores = await calculateDriverScore(driver.id);
          base.performanceScore = scores.overallScore;
        }

        return base;
      })
    );

    return NextResponse.json(
      {
        success: true,
        data,
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
    console.error('[Drivers] List error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch drivers.' },
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
          error: { code: 'FORBIDDEN', message: 'Only operators can register drivers.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, phone, nrc, licenceNumber, licenceExpiry, operatorId } = body;

    if (!name || !phone || !licenceNumber || !licenceExpiry || !operatorId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'name, phone, licenceNumber, licenceExpiry, and operatorId are required.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const formattedPhone = formatZambianPhone(phone);

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

    // Check if a user with this phone already exists
    let user = await prisma.user.findUnique({
      where: { phone: formattedPhone },
    });

    if (user) {
      // Check if already a driver
      const existingDriver = await prisma.driver.findUnique({
        where: { userId: user.id },
      });
      if (existingDriver) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'DUPLICATE',
              message: 'A driver with this phone number already exists.',
            },
            timestamp: new Date().toISOString(),
          },
          { status: 409 }
        );
      }
    } else {
      // Create user account for the driver
      const defaultPassword = await hashPassword('TwendeDriver2024!');
      user = await prisma.user.create({
        data: {
          phone: formattedPhone,
          name: name.trim(),
          nrc: nrc ?? null,
          passwordHash: defaultPassword,
          role: 'DRIVER',
        },
      });
    }

    // Create driver record
    const driver = await prisma.driver.create({
      data: {
        userId: user.id,
        operatorId,
        licenceNumber: licenceNumber.trim(),
        licenceExpiry: new Date(licenceExpiry),
      },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
        operator: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: driver,
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Drivers] Create error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to register driver.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
