import { prisma } from './prisma';

export interface PromoValidationResult {
  valid: boolean;
  reason?: string;
  discountType?: string;
  discountValue?: number;
  code?: string;
}

export interface PromoApplyResult {
  originalPrice: number;
  discount: number;
  finalPrice: number;
  promoCode: string;
}

/**
 * Validate a promo code for a given booking amount and optional operator.
 */
export async function validatePromoCode(
  code: string,
  bookingAmount: number,
  operatorId?: string
): Promise<PromoValidationResult> {
  const promo = await prisma.promoCode.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!promo) {
    return { valid: false, reason: 'Promo code not found.' };
  }

  if (!promo.isActive) {
    return { valid: false, reason: 'Promo code is no longer active.' };
  }

  const now = new Date();

  if (now < promo.validFrom) {
    return { valid: false, reason: 'Promo code is not yet valid.' };
  }

  if (now > promo.validUntil) {
    return { valid: false, reason: 'Promo code has expired.' };
  }

  if (promo.currentUses >= promo.maxUses) {
    return { valid: false, reason: 'Promo code usage limit reached.' };
  }

  if (promo.minBookingAmount != null && bookingAmount < promo.minBookingAmount) {
    return {
      valid: false,
      reason: `Minimum booking amount of K ${promo.minBookingAmount.toFixed(2)} required.`,
    };
  }

  // If promo is operator-specific, it must match the operator
  if (promo.operatorId && operatorId && promo.operatorId !== operatorId) {
    return { valid: false, reason: 'Promo code is not valid for this operator.' };
  }

  return {
    valid: true,
    discountType: promo.discountType,
    discountValue: promo.discountValue,
    code: promo.code,
  };
}

/**
 * Calculate the discounted price after applying a promo code.
 */
export async function applyPromoCode(
  code: string,
  bookingAmount: number
): Promise<PromoApplyResult> {
  const promo = await prisma.promoCode.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!promo) {
    throw new Error('Promo code not found.');
  }

  let discount = 0;

  if (promo.discountType === 'PERCENTAGE') {
    discount = (bookingAmount * promo.discountValue) / 100;
  } else if (promo.discountType === 'FIXED') {
    discount = promo.discountValue;
  }

  // Discount cannot exceed the booking amount
  discount = Math.min(discount, bookingAmount);
  discount = Math.round(discount * 100) / 100;

  const finalPrice = Math.round((bookingAmount - discount) * 100) / 100;

  return {
    originalPrice: bookingAmount,
    discount,
    finalPrice,
    promoCode: promo.code,
  };
}

/**
 * Increment the usage counter for a promo code and deactivate if limit reached.
 */
export async function redeemPromoCode(code: string): Promise<void> {
  const promo = await prisma.promoCode.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!promo) {
    throw new Error('Promo code not found.');
  }

  const newUses = promo.currentUses + 1;

  await prisma.promoCode.update({
    where: { code: code.toUpperCase() },
    data: {
      currentUses: newUses,
      isActive: newUses < promo.maxUses,
    },
  });
}

/**
 * Check if a booking already has a promo code applied.
 * We track this by checking if the booking price differs from the journey base price
 * and if there's a Redis record for the booking-promo mapping.
 */
export async function isCodeStacked(bookingId: string): Promise<boolean> {
  // We use a simple approach: check Redis for a promo-applied flag on the booking
  const { redis } = await import('./redis');
  const key = `promo:applied:${bookingId}`;
  const existing = await redis.get(key);
  return existing !== null;
}

/**
 * Record that a promo code has been applied to a booking (prevents stacking).
 */
export async function markPromoApplied(bookingId: string, code: string): Promise<void> {
  const { redis } = await import('./redis');
  const key = `promo:applied:${bookingId}`;
  // Store for 30 days (more than enough to cover booking lifecycle)
  await redis.set(key, code, 'EX', 30 * 24 * 60 * 60);
}
