import { prisma } from '../prisma';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export function getOperatorRiskLevel(score: number): RiskLevel {
  if (score >= 7.0) return 'LOW';
  if (score >= 4.0) return 'MEDIUM';
  return 'HIGH';
}

export interface ComplianceBreakdown {
  score: number;
  riskLevel: RiskLevel;
  totalAlerts: number;
  criticalAlerts: number;
  averageRating: number;
  totalRatings: number;
  alertDeduction: number;
  criticalDeduction: number;
  ratingDeduction: number;
}

export async function recalculateComplianceScore(operatorId: string): Promise<ComplianceBreakdown> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [totalAlerts, criticalAlerts, ratings, sosCount] = await Promise.all([
    prisma.safetyAlert.count({
      where: {
        operatorId,
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.safetyAlert.count({
      where: {
        operatorId,
        severity: 'CRITICAL',
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.rating.findMany({
      where: {
        driver: { operatorId },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { stars: true },
    }),
    prisma.sosEvent.count({
      where: {
        journey: { operatorId },
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
  ]);

  const averageRating =
    ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length : 5.0;

  // Calculate deductions
  const alertDeduction = Math.min(totalAlerts * 0.2, 3.0);
  const criticalDeduction = Math.min(criticalAlerts * 0.8, 3.0);
  const sosDeduction = Math.min(sosCount * 0.5, 2.0);
  const ratingDeduction = averageRating < 3.5 ? (3.5 - averageRating) * 1.5 : 0;

  let score = 10.0;
  score -= alertDeduction;
  score -= criticalDeduction;
  score -= sosDeduction;
  score -= ratingDeduction;
  score = Math.max(0, Math.min(10, Math.round(score * 10) / 10));

  await prisma.operator.update({
    where: { id: operatorId },
    data: { complianceScore: score },
  });

  const riskLevel = getOperatorRiskLevel(score);

  console.log(
    `[Compliance] Operator ${operatorId}: score=${score}, risk=${riskLevel} (alerts=${totalAlerts}, critical=${criticalAlerts}, rating=${averageRating.toFixed(1)})`
  );

  return {
    score,
    riskLevel,
    totalAlerts,
    criticalAlerts,
    averageRating: Math.round(averageRating * 10) / 10,
    totalRatings: ratings.length,
    alertDeduction,
    criticalDeduction,
    ratingDeduction,
  };
}
