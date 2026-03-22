import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET /api/promo-codes
 * List promo codes. Filter by operatorId, isActive.
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
    const operatorId = searchParams.get('operatorId');
    const isActive = searchParams.get('isActive');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};

    if (operatorId) {
      where.operatorId = operatorId;
    }

    if (isActive !== null && isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    const [promoCodes, totalItems] = await Promise.all([
      prisma.promoCode.findMany({
        where,
        include: {
          operator: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.promoCode.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);

    return NextResponse.json(
      {
        success: true,
        data: promoCodes,
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
    console.error('[PromoCodes] List error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch promo codes.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/promo-codes
 * Create a promo code. OPERATOR_ADMIN role only.
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

    if (user.role !== 'OPERATOR_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only operators can create promo codes.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      code,
      operatorId,
      discountType,
      discountValue,
      maxUses,
      minBookingAmount,
      validFrom,
      validUntil,
    } = body;

    // Validation
    if (!code || !discountType || discountValue == null || !validFrom || !validUntil) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'code, discountType, discountValue, validFrom, and validUntil are required.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const upperCode = String(code).toUpperCase().trim();

    if (upperCode.length < 3 || upperCode.length > 50) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Code must be between 3 and 50 characters.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    if (!['PERCENTAGE', 'FIXED'].includes(discountType)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'discountType must be PERCENTAGE or FIXED.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    if (typeof discountValue !== 'number' || discountValue <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'discountValue must be a positive number.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    if (discountType === 'PERCENTAGE' && discountValue > 100) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Percentage discount cannot exceed 100%.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const fromDate = new Date(validFrom);
    const untilDate = new Date(validUntil);

    if (isNaN(fromDate.getTime()) || isNaN(untilDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid date format for validFrom or validUntil.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    if (untilDate <= fromDate) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'validUntil must be after validFrom.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Check uniqueness
    const existing = await prisma.promoCode.findUnique({ where: { code: upperCode } });
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'CONFLICT', message: 'A promo code with this code already exists.' },
          timestamp: new Date().toISOString(),
        },
        { status: 409 }
      );
    }

    const promoCode = await prisma.promoCode.create({
      data: {
        code: upperCode,
        operatorId: operatorId || null,
        discountType,
        discountValue,
        maxUses: maxUses ?? 100,
        minBookingAmount: minBookingAmount ?? null,
        validFrom: fromDate,
        validUntil: untilDate,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: promoCode,
        message: 'Promo code created successfully.',
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[PromoCodes] Create error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create promo code.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
