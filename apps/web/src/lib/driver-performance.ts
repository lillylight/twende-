import { prisma } from './prisma';

export interface PerformanceBreakdown {
  safetyScore: number;
  onTimeScore: number;
  ratingScore: number;
  overallScore: number;
}

export interface DriverPerformanceReport {
  driverId: string;
  driverName: string;
  operatorId: string;
  scores: PerformanceBreakdown;
  details: {
    violationsLast30Days: number;
    totalJourneys: number;
    onTimeJourneys: number;
    onTimePercentage: number;
    averageRating: number;
    totalRatings: number;
  };
  recentViolations: Array<{
    id: string;
    alertType: string;
    severity: string;
    createdAt: Date;
  }>;
  recentRatings: Array<{
    id: string;
    stars: number;
    comment: string | null;
    createdAt: Date;
  }>;
  recommendations: string[];
}

const SAFETY_WEIGHT = 0.4;
const ON_TIME_WEIGHT = 0.3;
const RATING_WEIGHT = 0.3;
const ON_TIME_THRESHOLD_MINUTES = 15;

/**
 * Calculate the weighted performance score for a driver.
 * Score = 40% safety + 30% on-time + 30% ratings
 */
export async function calculateDriverScore(driverId: string): Promise<PerformanceBreakdown> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Safety: violations in last 30 days
  const violationCount = await prisma.safetyAlert.count({
    where: {
      journey: { driverId },
      createdAt: { gte: thirtyDaysAgo },
    },
  });

  // 0 violations = 100, each violation -10, min 0
  const safetyScore = Math.max(0, 100 - violationCount * 10);

  // On-time: % of journeys that departed within 15 min of scheduled time
  const journeys = await prisma.journey.findMany({
    where: {
      driverId,
      status: 'COMPLETED',
      departureTime: { gte: thirtyDaysAgo },
    },
    select: {
      departureTime: true,
      gpsLogs: {
        orderBy: { timestamp: 'asc' },
        take: 1,
        select: { timestamp: true },
      },
    },
  });

  let onTimeCount = 0;
  const totalJourneys = journeys.length;

  for (const journey of journeys) {
    const firstLog = journey.gpsLogs[0];
    if (firstLog) {
      const diff = Math.abs(firstLog.timestamp.getTime() - journey.departureTime.getTime());
      const diffMinutes = diff / (60 * 1000);
      if (diffMinutes <= ON_TIME_THRESHOLD_MINUTES) {
        onTimeCount++;
      }
    } else {
      // If no GPS log, assume on time (can't determine)
      onTimeCount++;
    }
  }

  const onTimeScore = totalJourneys > 0 ? Math.round((onTimeCount / totalJourneys) * 100) : 100;

  // Ratings: average star rating * 20 (5 stars = 100)
  const ratingAgg = await prisma.rating.aggregate({
    where: { driverId },
    _avg: { stars: true },
  });

  const averageRating = ratingAgg._avg.stars ?? 5;
  const ratingScore = Math.round(averageRating * 20);

  const overallScore = Math.round(
    safetyScore * SAFETY_WEIGHT + onTimeScore * ON_TIME_WEIGHT + ratingScore * RATING_WEIGHT
  );

  return {
    safetyScore,
    onTimeScore,
    ratingScore,
    overallScore,
  };
}

/**
 * Generate a full performance report for a driver.
 */
export async function getDriverPerformanceReport(
  driverId: string
): Promise<DriverPerformanceReport | null> {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    include: {
      user: { select: { name: true } },
      operator: { select: { id: true } },
    },
  });

  if (!driver) return null;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const scores = await calculateDriverScore(driverId);

  // Get violation details
  const recentViolations = await prisma.safetyAlert.findMany({
    where: {
      journey: { driverId },
      createdAt: { gte: thirtyDaysAgo },
    },
    select: {
      id: true,
      alertType: true,
      severity: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  // Get rating details
  const recentRatings = await prisma.rating.findMany({
    where: { driverId },
    select: {
      id: true,
      stars: true,
      comment: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  // On-time details
  const completedJourneys = await prisma.journey.findMany({
    where: {
      driverId,
      status: 'COMPLETED',
      departureTime: { gte: thirtyDaysAgo },
    },
    select: {
      departureTime: true,
      gpsLogs: {
        orderBy: { timestamp: 'asc' },
        take: 1,
        select: { timestamp: true },
      },
    },
  });

  let onTimeCount = 0;
  for (const journey of completedJourneys) {
    const firstLog = journey.gpsLogs[0];
    if (firstLog) {
      const diff = Math.abs(firstLog.timestamp.getTime() - journey.departureTime.getTime());
      if (diff / (60 * 1000) <= ON_TIME_THRESHOLD_MINUTES) {
        onTimeCount++;
      }
    } else {
      onTimeCount++;
    }
  }

  const totalRatings = await prisma.rating.count({ where: { driverId } });
  const ratingAgg = await prisma.rating.aggregate({
    where: { driverId },
    _avg: { stars: true },
  });

  // Generate recommendations
  const recommendations: string[] = [];

  if (scores.safetyScore < 70) {
    recommendations.push(
      'Safety score is low. Review driving habits and attend refresher safety training.'
    );
  }
  if (scores.onTimeScore < 70) {
    recommendations.push(
      'Punctuality needs improvement. Aim to depart within 15 minutes of scheduled time.'
    );
  }
  if (scores.ratingScore < 70) {
    recommendations.push(
      'Passenger ratings are below average. Focus on customer service and comfort.'
    );
  }
  if (recentViolations.filter((v) => v.severity === 'CRITICAL').length > 0) {
    recommendations.push(
      'Critical safety violations detected. Mandatory safety briefing required.'
    );
  }
  if (scores.overallScore >= 90) {
    recommendations.push('Excellent performance! Eligible for performance bonus consideration.');
  }

  return {
    driverId,
    driverName: driver.user.name,
    operatorId: driver.operatorId,
    scores,
    details: {
      violationsLast30Days: recentViolations.length,
      totalJourneys: completedJourneys.length,
      onTimeJourneys: onTimeCount,
      onTimePercentage:
        completedJourneys.length > 0
          ? Math.round((onTimeCount / completedJourneys.length) * 100)
          : 100,
      averageRating: ratingAgg._avg.stars ?? 5,
      totalRatings,
    },
    recentViolations,
    recentRatings,
    recommendations,
  };
}

/**
 * Find drivers for a given operator whose score is below 60, flagging them for retraining.
 */
export async function flagDriversForRetraining(
  operatorId: string
): Promise<Array<{ driverId: string; name: string; score: number }>> {
  const drivers = await prisma.driver.findMany({
    where: { operatorId, isActive: true },
    select: {
      id: true,
      user: { select: { name: true } },
    },
  });

  const flagged: Array<{ driverId: string; name: string; score: number }> = [];

  for (const driver of drivers) {
    const scores = await calculateDriverScore(driver.id);
    if (scores.overallScore < 60) {
      flagged.push({
        driverId: driver.id,
        name: driver.user.name,
        score: scores.overallScore,
      });
    }
  }

  return flagged.sort((a, b) => a.score - b.score);
}

/**
 * Get ranked list of drivers by performance score for a given operator.
 */
export async function getDriverRankings(
  operatorId: string
): Promise<Array<{ driverId: string; name: string; scores: PerformanceBreakdown; rank: number }>> {
  const drivers = await prisma.driver.findMany({
    where: { operatorId, isActive: true },
    select: {
      id: true,
      user: { select: { name: true } },
    },
  });

  const rankings: Array<{
    driverId: string;
    name: string;
    scores: PerformanceBreakdown;
    rank: number;
  }> = [];

  for (const driver of drivers) {
    const scores = await calculateDriverScore(driver.id);
    rankings.push({
      driverId: driver.id,
      name: driver.user.name,
      scores,
      rank: 0,
    });
  }

  // Sort by overall score descending
  rankings.sort((a, b) => b.scores.overallScore - a.scores.overallScore);

  // Assign ranks
  for (let i = 0; i < rankings.length; i++) {
    rankings[i].rank = i + 1;
  }

  return rankings;
}
