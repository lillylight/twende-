import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { calculateDynamicPrice, getDemandForecast } from '@/lib/pricing';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/journeys/:id/pricing
 * Get current pricing info for a journey (public).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: journeyId } = await params;

    const journey = await prisma.journey.findUnique({
      where: { id: journeyId },
      select: { id: true, routeId: true, departureTime: true },
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

    const pricing = await calculateDynamicPrice(journeyId);
    const forecast = await getDemandForecast(journey.routeId, journey.departureTime);

    return NextResponse.json(
      {
        success: true,
        data: {
          journeyId,
          basePrice: pricing.basePrice,
          currentPrice: pricing.currentPrice,
          demandRatio: pricing.demandRatio,
          adjustment: pricing.adjustment,
          forecast,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Pricing] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch pricing.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/journeys/:id/pricing
 * Manually override the journey price. OPERATOR_ADMIN role only.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    if (user.role !== 'OPERATOR_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only operators can override pricing.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const { id: journeyId } = await params;
    const body = await request.json();
    const { price } = body;

    if (price == null || typeof price !== 'number' || price <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'A positive numeric price is required.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const journey = await prisma.journey.findUnique({
      where: { id: journeyId },
      select: { id: true, operatorId: true },
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

    const updatedJourney = await prisma.journey.update({
      where: { id: journeyId },
      data: { price },
      select: {
        id: true,
        price: true,
        totalSeats: true,
        availableSeats: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: updatedJourney,
        message: 'Price updated successfully.',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Pricing] PUT error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update pricing.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
