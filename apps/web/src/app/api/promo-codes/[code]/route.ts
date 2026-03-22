import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { validatePromoCode } from '@/lib/promotions';

interface RouteParams {
  params: Promise<{ code: string }>;
}

/**
 * GET /api/promo-codes/:code
 * Validate a promo code (public endpoint). Returns validity and discount info.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;
    const { searchParams } = new URL(request.url);
    const amount = parseFloat(searchParams.get('amount') ?? '0');
    const operatorId = searchParams.get('operatorId') ?? undefined;

    const validation = await validatePromoCode(code, amount, operatorId);

    return NextResponse.json(
      {
        success: true,
        data: validation,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[PromoCodes] Validate error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to validate promo code.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/promo-codes/:code
 * Update a promo code. Operator only.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
          error: { code: 'FORBIDDEN', message: 'Only operators can update promo codes.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const { code } = await params;
    const upperCode = code.toUpperCase();

    const promo = await prisma.promoCode.findUnique({ where: { code: upperCode } });

    if (!promo) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Promo code not found.' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      discountType,
      discountValue,
      maxUses,
      minBookingAmount,
      validFrom,
      validUntil,
      isActive,
    } = body;

    const updateData: Record<string, unknown> = {};

    if (discountType !== undefined) {
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
      updateData.discountType = discountType;
    }

    if (discountValue !== undefined) {
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
      const effectiveType = (updateData.discountType as string) ?? promo.discountType;
      if (effectiveType === 'PERCENTAGE' && discountValue > 100) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Percentage discount cannot exceed 100%.' },
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }
      updateData.discountValue = discountValue;
    }

    if (maxUses !== undefined) updateData.maxUses = maxUses;
    if (minBookingAmount !== undefined) updateData.minBookingAmount = minBookingAmount;
    if (validFrom !== undefined) updateData.validFrom = new Date(validFrom);
    if (validUntil !== undefined) updateData.validUntil = new Date(validUntil);
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.promoCode.update({
      where: { code: upperCode },
      data: updateData,
    });

    return NextResponse.json(
      {
        success: true,
        data: updated,
        message: 'Promo code updated successfully.',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[PromoCodes] Update error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update promo code.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/promo-codes/:code
 * Deactivate a promo code (soft delete). Operator only.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
          error: { code: 'FORBIDDEN', message: 'Only operators can deactivate promo codes.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const { code } = await params;
    const upperCode = code.toUpperCase();

    const promo = await prisma.promoCode.findUnique({ where: { code: upperCode } });

    if (!promo) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Promo code not found.' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    await prisma.promoCode.update({
      where: { code: upperCode },
      data: { isActive: false },
    });

    return NextResponse.json(
      {
        success: true,
        data: { code: upperCode, isActive: false },
        message: 'Promo code deactivated.',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[PromoCodes] Delete error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to deactivate promo code.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
