import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { generateBookingQR } from '@/lib/qrcode';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
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

    const { reference } = await params;

    const body = await request.json();
    const { newSeatNumber } = body;

    if (newSeatNumber === undefined || newSeatNumber === null) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'newSeatNumber is required.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const seatNum = Number(newSeatNumber);
    if (!Number.isInteger(seatNum) || seatNum < 1) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'newSeatNumber must be a positive integer.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Fetch booking with journey details
    const booking = await prisma.booking.findUnique({
      where: { reference },
      include: {
        journey: {
          select: {
            id: true,
            departureTime: true,
            totalSeats: true,
            price: true,
            status: true,
          },
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

    // Only the booking owner can modify
    if (booking.userId !== user.userId && user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'You can only modify your own bookings.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    // Booking must be CONFIRMED (not checked in, cancelled, etc.)
    if (booking.status !== 'CONFIRMED') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot modify a booking with status "${booking.status}". Only CONFIRMED bookings can be modified.`,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Must be at least 1 hour before departure
    const now = new Date();
    const departure = new Date(booking.journey.departureTime);
    const hoursUntilDeparture = (departure.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilDeparture < 1) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MODIFICATION_WINDOW_CLOSED',
            message: 'Bookings can only be modified at least 1 hour before departure.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Validate seat number is within range
    if (seatNum > booking.journey.totalSeats) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_SEAT',
            message: `Seat ${seatNum} does not exist. This journey has ${booking.journey.totalSeats} seats.`,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Same seat check
    if (booking.seatNumber === seatNum) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SAME_SEAT',
            message: 'The new seat number is the same as the current seat.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Check if the new seat is available
    const existingSeat = await prisma.booking.findFirst({
      where: {
        journeyId: booking.journeyId,
        seatNumber: seatNum,
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
      },
    });

    if (existingSeat) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'SEAT_TAKEN', message: `Seat ${seatNum} is already taken.` },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Calculate price difference (same class = free for now; future: premium vs standard)
    // For now, all seats on the same journey are the same price
    const priceDifference = 0;

    // Regenerate QR code with updated booking info
    const newQrCode = generateBookingQR(booking.reference, booking.journeyId);

    // Update booking with new seat
    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        seatNumber: seatNum,
        qrCode: newQrCode,
      },
      include: {
        journey: {
          include: {
            route: {
              select: { fromCity: true, toCity: true },
            },
          },
        },
      },
    });

    console.log(
      `[BookingModify] Booking ${reference} seat changed from ${booking.seatNumber} to ${seatNum}`
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          reference: updatedBooking.reference,
          journeyId: updatedBooking.journeyId,
          oldSeatNumber: booking.seatNumber,
          newSeatNumber: updatedBooking.seatNumber,
          price: Number(updatedBooking.price),
          priceDifference,
          route: `${updatedBooking.journey.route.fromCity} -> ${updatedBooking.journey.route.toCity}`,
          departureTime: updatedBooking.journey.departureTime,
          status: updatedBooking.status,
        },
        message:
          priceDifference > 0
            ? `Seat changed successfully. An additional K${priceDifference.toFixed(2)} will be charged.`
            : 'Seat changed successfully. No additional charge.',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Bookings/Modify] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to modify booking.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
