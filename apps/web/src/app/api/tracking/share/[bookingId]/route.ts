import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
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

    const { bookingId } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        journey: {
          select: {
            id: true,
            trackingToken: true,
            status: true,
            route: { select: { fromCity: true, toCity: true } },
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

    if (booking.userId !== user.userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only share tracking for your own bookings.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://zedpulse.co.zm';
    const trackingToken = booking.journey.trackingToken;
    const trackingUrl = `${baseUrl}/track/${trackingToken}`;

    return NextResponse.json(
      {
        success: true,
        data: {
          trackingUrl,
          trackingToken,
          journeyId: booking.journey.id,
          route: `${booking.journey.route.fromCity} -> ${booking.journey.route.toCity}`,
          journeyStatus: booking.journey.status,
        },
        message: 'Share this link to let others track your journey in real-time.',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Tracking] Share error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to generate tracking link.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
