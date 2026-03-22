import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { generateBookingReference } from '@/lib/utils';
import { addPaymentJob } from '@/lib/queues/payments.queue';
import { type PaymentProvider } from '@/lib/payments';
import { generateBookingQR } from '@/lib/qrcode';
import { createAuditLog, AuditAction } from '@/lib/audit';

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
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));
    const status = searchParams.get('status');
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { userId: user.userId };
    if (status) {
      where.status = status;
    }

    const [bookings, totalItems] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          journey: {
            include: {
              route: {
                select: { fromCity: true, toCity: true, name: true },
              },
              operator: {
                select: { name: true },
              },
              vehicle: {
                select: { registrationPlate: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.booking.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);

    return NextResponse.json(
      {
        success: true,
        data: bookings,
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
    console.error('[Bookings] List error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch bookings.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

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
    const { journeyId, seatNumber, paymentMethod, passengerName, passengerPhone } = body;

    if (!journeyId || !paymentMethod) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'journeyId and paymentMethod are required.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const validMethods: PaymentProvider[] = ['AIRTEL_MONEY', 'MTN_MOMO', 'ZAMTEL_KWACHA'];
    if (!validMethods.includes(paymentMethod)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid payment method. Use AIRTEL_MONEY, MTN_MOMO, or ZAMTEL_KWACHA.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Fetch the journey and check availability
    const journey = await prisma.journey.findUnique({
      where: { id: journeyId },
      include: {
        route: { select: { fromCity: true, toCity: true } },
      },
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

    if (journey.status !== 'SCHEDULED' && journey.status !== 'BOARDING') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'JOURNEY_UNAVAILABLE',
            message: 'This journey is no longer accepting bookings.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    if (journey.availableSeats <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NO_SEATS', message: 'No seats available on this journey.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Check if the specific seat is taken
    if (seatNumber) {
      const existingSeat = await prisma.booking.findFirst({
        where: {
          journeyId,
          seatNumber: String(seatNumber),
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        },
      });

      if (existingSeat) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'SEAT_TAKEN', message: `Seat ${seatNumber} is already taken.` },
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }
    }

    const reference = generateBookingReference();
    const phone = passengerPhone || user.phone;

    // Create booking and decrement available seats in a transaction
    const booking = await prisma.$transaction(async (tx) => {
      const updatedJourney = await tx.journey.update({
        where: { id: journeyId },
        data: { availableSeats: { decrement: 1 } },
      });

      if (updatedJourney.availableSeats < 0) {
        throw new Error('NO_SEATS_AVAILABLE');
      }

      const qrCode = generateBookingQR(reference, journeyId);

      return tx.booking.create({
        data: {
          journeyId,
          userId: user.userId,
          reference,
          seatNumber: seatNumber ? String(seatNumber) : null,
          paymentMethod,
          paymentStatus: 'PENDING',
          status: 'PENDING',
          price: journey.price,
          bookedVia: 'APP',
          passengerPhone: phone,
          passengerName: passengerName || null,
          qrCode,
        },
      });
    });

    // Audit log: booking created
    await createAuditLog({
      userId: user.userId,
      userRole: user.role,
      action: AuditAction.BOOKING_CREATE,
      resource: 'booking',
      resourceId: booking.id,
      details: {
        reference,
        journeyId,
        seatNumber: seatNumber ?? null,
        paymentMethod,
        price: Number(journey.price),
        route: `${journey.route.fromCity} -> ${journey.route.toCity}`,
      },
      request,
    });

    // Queue payment processing
    await addPaymentJob({
      bookingId: booking.id,
      method: paymentMethod as PaymentProvider,
      phone,
      amount: journey.price,
      reference,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: booking.id,
          reference: booking.reference,
          journeyId: booking.journeyId,
          seatNumber: booking.seatNumber,
          price: booking.price,
          paymentMethod: booking.paymentMethod,
          paymentStatus: booking.paymentStatus,
          status: booking.status,
          route: `${journey.route.fromCity} -> ${journey.route.toCity}`,
          departureTime: journey.departureTime,
          createdAt: booking.createdAt,
        },
        message: 'Booking created. Payment prompt will be sent to your phone.',
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'NO_SEATS_AVAILABLE') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NO_SEATS', message: 'No seats available on this journey.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    console.error('[Bookings] Create error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create booking.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
