import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog, AuditAction } from '@/lib/audit';

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
              select: { fromCity: true, toCity: true, name: true, distanceKm: true },
            },
            operator: {
              select: { name: true, contactPhone: true },
            },
            vehicle: {
              select: { registrationPlate: true, make: true, model: true },
            },
            driver: {
              select: {
                id: true,
                user: { select: { firstName: true, lastName: true } },
              },
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

    return NextResponse.json(
      {
        success: true,
        data: booking,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Bookings] Get error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch booking.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
          select: { departureTime: true, id: true },
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

    if (booking.userId !== user.userId && user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'You can only cancel your own bookings.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    if (booking.status === 'CANCELLED') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'ALREADY_CANCELLED', message: 'This booking is already cancelled.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    if (booking.status === 'COMPLETED') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'CANNOT_CANCEL', message: 'Cannot cancel a completed booking.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Check if cancellation is at least 2 hours before departure
    const now = new Date();
    const departure = new Date(booking.journey.departureTime);
    const hoursUntilDeparture = (departure.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilDeparture < 2) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CANCELLATION_WINDOW_CLOSED',
            message: 'Bookings can only be cancelled at least 2 hours before departure.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Cancel booking and restore the seat
    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      await tx.journey.update({
        where: { id: booking.journey.id },
        data: { availableSeats: { increment: 1 } },
      });
    });

    // Audit log: booking cancelled
    await createAuditLog({
      userId: user.userId,
      userRole: user.role,
      action: AuditAction.BOOKING_CANCEL,
      resource: 'booking',
      resourceId: booking.id,
      details: {
        reference: booking.reference,
        journeyId: booking.journey.id,
        hoursBeforeDeparture: Math.round(hoursUntilDeparture * 10) / 10,
      },
      request,
    });

    return NextResponse.json(
      {
        success: true,
        data: { reference: booking.reference, status: 'CANCELLED' },
        message:
          'Booking cancelled successfully. Refund will be processed if payment was completed.',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Bookings] Cancel error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to cancel booking.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
