import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const journey = await prisma.journey.findUnique({
      where: { id },
      select: {
        id: true,
        totalSeats: true,
        availableSeats: true,
        status: true,
        vehicle: {
          select: {
            capacity: true,
            make: true,
            model: true,
            registrationPlate: true,
          },
        },
        bookings: {
          where: {
            status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] },
          },
          select: {
            seatNumber: true,
            status: true,
          },
        },
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

    // Build seat map
    const totalSeats = journey.totalSeats;
    const takenSeats = new Set(
      journey.bookings.filter((b) => b.seatNumber).map((b) => b.seatNumber)
    );

    const seatMap: Array<{ seatNumber: string; status: 'available' | 'taken' | 'pending' }> = [];

    for (let i = 1; i <= totalSeats; i++) {
      const seatNumber = String(i);
      const booking = journey.bookings.find((b) => b.seatNumber === seatNumber);

      let status: 'available' | 'taken' | 'pending' = 'available';
      if (booking) {
        status = booking.status === 'PENDING' ? 'pending' : 'taken';
      }

      seatMap.push({ seatNumber, status });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          journeyId: journey.id,
          journeyStatus: journey.status,
          vehicle: journey.vehicle,
          totalSeats: journey.totalSeats,
          availableSeats: journey.availableSeats,
          seatMap,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Journeys] Seat map error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch seat map.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
