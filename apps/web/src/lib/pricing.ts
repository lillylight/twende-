import { prisma } from './prisma';

export interface PricingResult {
  basePrice: number;
  currentPrice: number;
  demandRatio: number;
  adjustment: number; // percentage, e.g. +25 means 25% increase, -15 means 15% discount
}

/**
 * Calculate demand-based dynamic price for a journey.
 *
 * - High demand (>80% booked): increase by up to 50% (linear scale 80-100%)
 * - Low demand (<30% booked) AND within 24h of departure: decrease by up to 30%
 * - Normal demand: base price
 */
export async function calculateDynamicPrice(journeyId: string): Promise<PricingResult> {
  const journey = await prisma.journey.findUnique({
    where: { id: journeyId },
    select: {
      price: true,
      totalSeats: true,
      availableSeats: true,
      departureTime: true,
    },
  });

  if (!journey) {
    throw new Error('Journey not found');
  }

  const basePrice = Number(journey.price);
  const totalSeats = journey.totalSeats;
  const bookedSeats = totalSeats - journey.availableSeats;
  const demandRatio = totalSeats > 0 ? bookedSeats / totalSeats : 0;

  let adjustment = 0;
  let currentPrice = basePrice;

  if (demandRatio > 0.8) {
    // High demand: linear scale from 0% increase at 80% to 50% increase at 100%
    // adjustment = ((demandRatio - 0.8) / 0.2) * 50
    const scale = (demandRatio - 0.8) / 0.2; // 0 to 1
    adjustment = scale * 50; // 0% to 50%
    currentPrice = basePrice * (1 + adjustment / 100);
  } else if (demandRatio < 0.3) {
    // Low demand discount only applies within 24h of departure
    const hoursUntilDeparture = (journey.departureTime.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursUntilDeparture > 0 && hoursUntilDeparture <= 24) {
      // Linear scale: at 30% demand = 0% discount, at 0% demand = 30% discount
      const scale = (0.3 - demandRatio) / 0.3; // 0 to 1
      adjustment = -(scale * 30); // 0% to -30%
      currentPrice = basePrice * (1 + adjustment / 100);
    }
  }

  // Round to 2 decimal places (Kwacha)
  currentPrice = Math.round(currentPrice * 100) / 100;
  adjustment = Math.round(adjustment * 100) / 100;

  return {
    basePrice,
    currentPrice,
    demandRatio: Math.round(demandRatio * 1000) / 1000,
    adjustment,
  };
}

/**
 * Recalculate and persist the dynamic price for a journey.
 */
export async function updateJourneyPricing(journeyId: string): Promise<PricingResult> {
  const pricing = await calculateDynamicPrice(journeyId);

  await prisma.journey.update({
    where: { id: journeyId },
    data: { price: pricing.currentPrice },
  });

  return pricing;
}

/**
 * Get a demand forecast for a route on a given date, based on historical
 * bookings for the same route and day-of-week.
 *
 * Returns an average occupancy ratio and the number of historical journeys
 * used to calculate it.
 */
export async function getDemandForecast(
  routeId: string,
  date: Date
): Promise<{
  averageOccupancy: number;
  historicalJourneys: number;
  dayOfWeek: number;
  predictedDemand: 'LOW' | 'NORMAL' | 'HIGH';
}> {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

  // Fetch completed/en-route journeys for this route on the same day of week
  // from the last 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const historicalJourneys = await prisma.journey.findMany({
    where: {
      routeId,
      status: { in: ['COMPLETED', 'EN_ROUTE'] },
      departureTime: { gte: ninetyDaysAgo },
    },
    select: {
      totalSeats: true,
      availableSeats: true,
      departureTime: true,
    },
  });

  // Filter to same day-of-week in application code (Prisma doesn't support
  // extracting day-of-week directly in all databases)
  const sameDayJourneys = historicalJourneys.filter((j) => j.departureTime.getDay() === dayOfWeek);

  if (sameDayJourneys.length === 0) {
    return {
      averageOccupancy: 0,
      historicalJourneys: 0,
      dayOfWeek,
      predictedDemand: 'NORMAL',
    };
  }

  const totalOccupancy = sameDayJourneys.reduce((sum, j) => {
    const booked = j.totalSeats - j.availableSeats;
    const ratio = j.totalSeats > 0 ? booked / j.totalSeats : 0;
    return sum + ratio;
  }, 0);

  const averageOccupancy = Math.round((totalOccupancy / sameDayJourneys.length) * 1000) / 1000;

  let predictedDemand: 'LOW' | 'NORMAL' | 'HIGH' = 'NORMAL';
  if (averageOccupancy > 0.7) {
    predictedDemand = 'HIGH';
  } else if (averageOccupancy < 0.3) {
    predictedDemand = 'LOW';
  }

  return {
    averageOccupancy,
    historicalJourneys: sameDayJourneys.length,
    dayOfWeek,
    predictedDemand,
  };
}
