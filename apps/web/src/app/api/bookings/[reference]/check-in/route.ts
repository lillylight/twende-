import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { decodeBookingQR } from '@/lib/qrcode';

export async function POST(
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

    // Only drivers, operators, and RTSA officials can perform check-in
    const allowedRoles = ['DRIVER', 'OPERATOR', 'OPERATOR_ADMIN', 'RTSA_OFFICER', 'ADMIN'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only terminal staff can perform check-in.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const { reference } = await params;

    const body = await request.json();
    const { qrData } = body;

    if (!qrData || typeof qrData !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'qrData is required.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Decode and verify the QR payload
    const decoded = decodeBookingQR(qrData);

    if (!decoded) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_QR', message: 'QR code is invalid or has been tampered with.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Ensure the QR reference matches the URL reference
    if (decoded.reference !== reference) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'REFERENCE_MISMATCH',
            message: 'QR code does not match the booking reference.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Fetch the booking with journey info
    const booking = await prisma.booking.findUnique({
      where: { reference },
      include: {
        journey: {
          select: {
            id: true,
            departureTime: true,
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

    // Prevent duplicate check-in
    if (booking.status === 'CHECKED_IN') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ALREADY_CHECKED_IN',
            message: 'Passenger has already been checked in.',
          },
          data: {
            reference: booking.reference,
            passengerName: booking.passengerName,
            seatNumber: booking.seatNumber,
            checkedInAt: booking.checkedInAt,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 409 }
      );
    }

    // Booking must be CONFIRMED
    if (booking.status !== 'CONFIRMED') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Booking status is "${booking.status}". Only CONFIRMED bookings can be checked in.`,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Payment must be completed
    if (booking.paymentStatus !== 'PAID') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PAYMENT_INCOMPLETE',
            message: 'Payment has not been completed for this booking.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Journey must not have already completed or been cancelled
    const journeyStatus = booking.journey.status;
    const validJourneyStatuses = ['SCHEDULED', 'BOARDING', 'EN_ROUTE'];
    if (!validJourneyStatuses.includes(journeyStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'JOURNEY_NOT_ACTIVE',
            message: `Journey status is "${journeyStatus}". Check-in is only allowed for active journeys.`,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Perform the check-in
    const now = new Date();
    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CHECKED_IN',
        checkedInAt: now,
      },
    });

    console.log(
      `[CheckIn] Booking ${reference} checked in at ${now.toISOString()} by user ${user.userId}`
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          reference: updatedBooking.reference,
          passengerName: updatedBooking.passengerName,
          seatNumber: updatedBooking.seatNumber,
          status: updatedBooking.status,
          checkedInAt: updatedBooking.checkedInAt,
          boardingStatus: 'BOARDED',
        },
        message: 'Passenger checked in successfully.',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Bookings/CheckIn] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to process check-in.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
