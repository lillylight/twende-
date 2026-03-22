import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import {
  validatePromoCode,
  applyPromoCode,
  redeemPromoCode,
  isCodeStacked,
  markPromoApplied,
} from '@/lib/promotions';

/**
 * POST /api/bookings/apply-promo
 * Apply a promo code to a booking.
 * Body: { bookingId: string, code: string }
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

    const body = await request.json();
    const { bookingId, code } = body;

    if (!bookingId || !code) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'bookingId and code are required.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Fetch the booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        journey: {
          select: { operatorId: true },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Booking not found.' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Check booking ownership
    if (booking.userId !== user.userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only apply promo codes to your own bookings.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    // Only allow on PENDING or CONFIRMED bookings
    if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: 'Promo codes can only be applied to PENDING or CONFIRMED bookings.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Check for stacking -- prevent applying multiple codes
    const alreadyApplied = await isCodeStacked(bookingId);
    if (alreadyApplied) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PROMO_STACKED',
            message: 'A promo code has already been applied to this booking.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Validate the promo code
    const bookingAmount = Number(booking.price);
    const validation = await validatePromoCode(code, bookingAmount, booking.journey.operatorId);

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_PROMO', message: validation.reason ?? 'Invalid promo code.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Calculate the discounted price
    const result = await applyPromoCode(code, bookingAmount);

    // Update the booking price
    await prisma.booking.update({
      where: { id: bookingId },
      data: { price: result.finalPrice },
    });

    // Redeem the promo code (increment usage)
    await redeemPromoCode(code);

    // Mark the promo as applied to this booking (prevent stacking)
    await markPromoApplied(bookingId, code.toUpperCase());

    return NextResponse.json(
      {
        success: true,
        data: {
          bookingId,
          originalPrice: result.originalPrice,
          discount: result.discount,
          finalPrice: result.finalPrice,
          promoCode: result.promoCode,
        },
        message: 'Promo code applied successfully.',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Bookings] Apply promo error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to apply promo code.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
