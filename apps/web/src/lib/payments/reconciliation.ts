import { prisma } from '@/lib/prisma';

/**
 * Platform commission rate (5%).
 */
const PLATFORM_COMMISSION_RATE = 0.05;

// ── Types ────────────────────────────────────────────────────────────────────

export interface Discrepancy {
  bookingId: string;
  reference: string;
  bookingStatus: string;
  paymentStatus: string;
  issue: string;
  amount: number;
}

export interface OperatorPayout {
  operatorId: string;
  operatorName: string;
  grossRevenue: number;
  commission: number;
  netPayout: number;
  bookingCount: number;
}

export interface ReconciliationReport {
  date: string;
  totalBookings: number;
  totalRevenue: number;
  totalCommission: number;
  totalOperatorPayouts: number;
  paidBookings: number;
  pendingBookings: number;
  failedBookings: number;
  discrepancies: Discrepancy[];
  operatorPayouts: OperatorPayout[];
  generatedAt: string;
}

// ── Reconciliation Functions ─────────────────────────────────────────────────

/**
 * Find bookings whose payment status and booking status are mismatched.
 *
 * Examples of discrepancies:
 * - Payment is PAID but booking is still PENDING (should be CONFIRMED)
 * - Booking is CONFIRMED but payment is FAILED
 * - Payment is PAID but booking is CANCELLED (refund may be needed)
 */
export async function reconcileTransactions(date: Date): Promise<Discrepancy[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const bookings = await prisma.booking.findMany({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    select: {
      id: true,
      reference: true,
      status: true,
      paymentStatus: true,
      price: true,
    },
  });

  const discrepancies: Discrepancy[] = [];

  for (const booking of bookings) {
    const amount = Number(booking.price);

    // PAID but booking still PENDING (should have been CONFIRMED)
    if (booking.paymentStatus === 'PAID' && booking.status === 'PENDING') {
      discrepancies.push({
        bookingId: booking.id,
        reference: booking.reference,
        bookingStatus: booking.status,
        paymentStatus: booking.paymentStatus,
        issue: 'Payment completed but booking not confirmed',
        amount,
      });
    }

    // Booking CONFIRMED but payment FAILED
    if (booking.status === 'CONFIRMED' && booking.paymentStatus === 'FAILED') {
      discrepancies.push({
        bookingId: booking.id,
        reference: booking.reference,
        bookingStatus: booking.status,
        paymentStatus: booking.paymentStatus,
        issue: 'Booking confirmed but payment failed',
        amount,
      });
    }

    // Booking CONFIRMED but payment still PENDING after a long time
    if (booking.status === 'CONFIRMED' && booking.paymentStatus === 'PENDING') {
      discrepancies.push({
        bookingId: booking.id,
        reference: booking.reference,
        bookingStatus: booking.status,
        paymentStatus: booking.paymentStatus,
        issue: 'Booking confirmed but payment still pending',
        amount,
      });
    }

    // Payment PAID but booking CANCELLED (potential refund needed)
    if (booking.paymentStatus === 'PAID' && booking.status === 'CANCELLED') {
      discrepancies.push({
        bookingId: booking.id,
        reference: booking.reference,
        bookingStatus: booking.status,
        paymentStatus: booking.paymentStatus,
        issue: 'Payment completed but booking cancelled — refund may be required',
        amount,
      });
    }

    // Payment PROCESSING for too long (stuck transaction)
    if (booking.paymentStatus === 'PROCESSING') {
      discrepancies.push({
        bookingId: booking.id,
        reference: booking.reference,
        bookingStatus: booking.status,
        paymentStatus: booking.paymentStatus,
        issue: 'Payment stuck in PROCESSING state',
        amount,
      });
    }
  }

  return discrepancies;
}

/**
 * Calculate operator revenue for a date range, subtracting the platform
 * commission of 5%.
 */
export async function calculateOperatorRevenue(
  operatorId: string,
  startDate: Date,
  endDate: Date
): Promise<OperatorPayout> {
  const bookings = await prisma.booking.findMany({
    where: {
      journey: {
        operatorId,
      },
      paymentStatus: 'PAID',
      status: { in: ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'] },
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      price: true,
    },
    // Also fetch the operator name
  });

  const operator = await prisma.operator.findUnique({
    where: { id: operatorId },
    select: { name: true },
  });

  const grossRevenue = bookings.reduce((sum, b) => sum + Number(b.price), 0);
  const commission = grossRevenue * PLATFORM_COMMISSION_RATE;
  const netPayout = grossRevenue - commission;

  return {
    operatorId,
    operatorName: operator?.name ?? 'Unknown Operator',
    grossRevenue: Math.round(grossRevenue * 100) / 100,
    commission: Math.round(commission * 100) / 100,
    netPayout: Math.round(netPayout * 100) / 100,
    bookingCount: bookings.length,
  };
}

/**
 * Generate a full reconciliation report for a given date: summary totals,
 * per-operator payouts, and any discrepancies found.
 */
export async function generateReconciliationReport(date: Date): Promise<ReconciliationReport> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Aggregate booking counts by payment status
  const bookings = await prisma.booking.findMany({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    select: {
      id: true,
      price: true,
      paymentStatus: true,
      status: true,
      journey: {
        select: {
          operatorId: true,
        },
      },
    },
  });

  const totalBookings = bookings.length;
  const paidBookings = bookings.filter((b) => b.paymentStatus === 'PAID').length;
  const pendingBookings = bookings.filter(
    (b) => b.paymentStatus === 'PENDING' || b.paymentStatus === 'PROCESSING'
  ).length;
  const failedBookings = bookings.filter((b) => b.paymentStatus === 'FAILED').length;

  const totalRevenue = bookings
    .filter((b) => b.paymentStatus === 'PAID')
    .reduce((sum, b) => sum + Number(b.price), 0);

  const totalCommission = Math.round(totalRevenue * PLATFORM_COMMISSION_RATE * 100) / 100;
  const totalOperatorPayouts = Math.round((totalRevenue - totalCommission) * 100) / 100;

  // Discrepancies
  const discrepancies = await reconcileTransactions(date);

  // Per-operator payouts
  const operatorIds = [...new Set(bookings.map((b) => b.journey.operatorId))];

  const operatorPayouts: OperatorPayout[] = [];
  for (const operatorId of operatorIds) {
    const payout = await calculateOperatorRevenue(operatorId, startOfDay, endOfDay);
    if (payout.bookingCount > 0) {
      operatorPayouts.push(payout);
    }
  }

  // Sort by gross revenue descending
  operatorPayouts.sort((a, b) => b.grossRevenue - a.grossRevenue);

  return {
    date: date.toISOString().split('T')[0],
    totalBookings,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalCommission,
    totalOperatorPayouts,
    paidBookings,
    pendingBookings,
    failedBookings,
    discrepancies,
    operatorPayouts,
    generatedAt: new Date().toISOString(),
  };
}
