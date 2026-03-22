import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { generateBookingQR, generateQRDataUrl } from '@/lib/qrcode';

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
      select: {
        id: true,
        reference: true,
        journeyId: true,
        userId: true,
        status: true,
        qrCode: true,
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

    // Ensure the booking belongs to the requesting user (unless RTSA/ADMIN)
    if (booking.userId !== user.userId && user.role !== 'RTSA_OFFICER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'You do not have access to this booking.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    if (booking.status === 'CANCELLED') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'BOOKING_CANCELLED',
            message: 'Cannot generate QR for a cancelled booking.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Use stored QR data or generate fresh
    let qrData = booking.qrCode;
    if (!qrData) {
      qrData = generateBookingQR(booking.reference, booking.journeyId);

      // Persist for future lookups
      await prisma.booking.update({
        where: { id: booking.id },
        data: { qrCode: qrData },
      });
    }

    const qrImageUrl = generateQRDataUrl(qrData);

    return NextResponse.json(
      {
        success: true,
        data: {
          reference: booking.reference,
          qrData,
          qrImageUrl,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Bookings/QR] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to generate QR code.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
