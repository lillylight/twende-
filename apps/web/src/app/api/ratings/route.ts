import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

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
    const { bookingId, stars, comment, safetyRating, cleanlinessRating, punctualityRating } = body;

    if (!bookingId || !stars) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'bookingId and stars (1-5) are required.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    if (stars < 1 || stars > 5) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Stars must be between 1 and 5.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Find the booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        journey: {
          select: { id: true, driverId: true, operatorId: true, status: true },
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
          error: { code: 'FORBIDDEN', message: 'You can only rate your own bookings.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    if (booking.status !== 'COMPLETED') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_COMPLETED', message: 'You can only rate completed trips.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Check if already rated
    const existingRating = await prisma.rating.findFirst({
      where: { bookingId, userId: user.userId },
    });

    if (existingRating) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'ALREADY_RATED', message: 'You have already rated this trip.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const rating = await prisma.rating.create({
      data: {
        bookingId,
        userId: user.userId,
        journeyId: booking.journeyId,
        driverId: booking.journey.driverId,
        operatorId: booking.journey.operatorId,
        stars,
        comment: comment ?? null,
        safetyRating: safetyRating ?? null,
        cleanlinessRating: cleanlinessRating ?? null,
        punctualityRating: punctualityRating ?? null,
      },
    });

    // Update driver's average rating
    if (booking.journey.driverId) {
      const driverRatings = await prisma.rating.aggregate({
        where: { driverId: booking.journey.driverId },
        _avg: { stars: true },
        _count: { stars: true },
      });

      if (driverRatings._avg.stars !== null) {
        await prisma.driver.update({
          where: { id: booking.journey.driverId },
          data: {
            averageRating: Math.round(driverRatings._avg.stars * 10) / 10,
            totalRatings: driverRatings._count.stars,
          },
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: rating.id,
          stars: rating.stars,
          comment: rating.comment,
          createdAt: rating.createdAt,
        },
        message: 'Thank you for your feedback!',
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Ratings] Submit error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to submit rating.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

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
    const skip = (page - 1) * pageSize;

    const where = { userId: user.userId };

    const [ratings, totalItems] = await Promise.all([
      prisma.rating.findMany({
        where,
        include: {
          journey: {
            select: {
              id: true,
              route: { select: { fromCity: true, toCity: true } },
              departureTime: true,
            },
          },
          driver: {
            select: {
              id: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.rating.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);

    return NextResponse.json(
      {
        success: true,
        data: ratings,
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
    console.error('[Ratings] List error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch ratings.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
