import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { generateReceiptPdf, type ReceiptData } from '@/lib/pdf-receipt';

export async function GET(
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

    const booking = await prisma.booking.findUnique({
      where: { reference },
      include: {
        journey: {
          include: {
            route: {
              select: { fromCity: true, toCity: true },
            },
            operator: {
              select: { name: true },
            },
            vehicle: {
              select: { registrationNumber: true },
            },
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

    // Verify the booking belongs to the authenticated user
    if (booking.userId !== user.userId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'You do not have access to this booking.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    // Only generate receipts for completed/confirmed bookings with payment
    if (
      booking.status !== 'COMPLETED' &&
      booking.status !== 'CONFIRMED' &&
      booking.status !== 'CHECKED_IN'
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RECEIPT_UNAVAILABLE',
            message: 'Receipts are only available for completed or confirmed bookings.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const receiptData: ReceiptData = {
      bookingReference: booking.reference,
      passengerName: booking.passengerName,
      passengerPhone: booking.passengerPhone,
      origin: booking.journey.route.fromCity,
      destination: booking.journey.route.toCity,
      departureTime: booking.journey.departureTime,
      arrivalTime: booking.journey.arrivalTime,
      seatNumber: booking.seatNumber ? String(booking.seatNumber) : null,
      amount: Number(booking.price),
      paymentMethod: booking.paymentMethod,
      paymentStatus: booking.paymentStatus,
      operatorName: booking.journey.operator.name,
      vehicleRegistration:
        booking.journey.vehicle?.registrationNumber ?? booking.journey.busRegistration,
      bookedAt: booking.createdAt,
    };

    const pdfBuffer = generateReceiptPdf(receiptData);

    const filename = `twende-receipt-${booking.reference}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error) {
    console.error('[Receipt] Generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to generate receipt.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
