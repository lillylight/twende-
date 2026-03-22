import { Queue, Worker, type Job } from 'bullmq';
import { redis } from '../redis';
import { prisma } from '../prisma';
import { addSMSJob } from './sms.queue';

const QUEUE_NAME = 'alerts';

export const alertsQueue = new Queue(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: { count: 2000 },
    removeOnFail: { count: 5000 },
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
  },
});

export type AlertJobType = 'speeding' | 'route_deviation' | 'no_signal' | 'update_compliance_score';

export interface SpeedingAlertData {
  type: 'speeding';
  journeyId: string;
  operatorId: string;
  speed: number;
  speedLimit: number;
  lat: number;
  lng: number;
  severity: 'WARNING' | 'CRITICAL';
}

export interface RouteDeviationAlertData {
  type: 'route_deviation';
  journeyId: string;
  operatorId: string;
  deviationMeters: number;
  lat: number;
  lng: number;
  severity: 'WARNING' | 'CRITICAL';
}

export interface NoSignalAlertData {
  type: 'no_signal';
  journeyId: string;
  operatorId: string;
  lastSeenAt: string;
  lastLat: number;
  lastLng: number;
}

export interface UpdateComplianceScoreData {
  type: 'update_compliance_score';
  operatorId: string;
}

export type AlertJobData =
  | SpeedingAlertData
  | RouteDeviationAlertData
  | NoSignalAlertData
  | UpdateComplianceScoreData;

export async function addAlertJob(data: AlertJobData): Promise<string> {
  const job = await alertsQueue.add(data.type, data);
  console.log(`[AlertsQueue] Job added: ${job.id} type=${data.type}`);
  return job.id ?? '';
}

const RTSA_PHONE = process.env.RTSA_ALERT_PHONE ?? '+260211234567';

async function getPassengerPhones(journeyId: string): Promise<string[]> {
  const bookings = await prisma.booking.findMany({
    where: {
      journeyId,
      status: { in: ['CONFIRMED', 'CHECKED_IN'] },
    },
    select: { passengerPhone: true },
  });

  return bookings.map((b) => b.passengerPhone);
}

async function handleSpeeding(data: SpeedingAlertData): Promise<void> {
  const { journeyId, operatorId, speed, speedLimit, lat, lng, severity } = data;

  await prisma.safetyAlert.create({
    data: {
      journeyId,
      operatorId,
      alertType: 'SPEEDING',
      severity,
      data: { speed, speedLimit, lat, lng },
    },
  });

  if (severity === 'CRITICAL') {
    const phones = await getPassengerPhones(journeyId);

    const journey = await prisma.journey.findUnique({
      where: { id: journeyId },
      include: { route: true },
    });

    const routeName = journey?.route
      ? `${journey.route.fromCity} to ${journey.route.toCity}`
      : 'your journey';

    const passengerMsg = `[Twende Safety] Speed alert on ${routeName}. Bus travelling at ${speed}km/h (limit: ${speedLimit}km/h). Authorities have been notified. Your safety is our priority.`;

    for (const phone of phones) {
      await addSMSJob(phone, passengerMsg);
    }

    const rtsaMsg = `[Twende RTSA Alert] CRITICAL SPEEDING: Journey ${journeyId}, speed ${speed}km/h in ${speedLimit}km/h zone. Location: ${lat},${lng}. Operator: ${operatorId}`;
    await addSMSJob(RTSA_PHONE, rtsaMsg);

    console.log(
      `[AlertsWorker] CRITICAL speeding alert: notified ${phones.length} passengers + RTSA`
    );
  }
}

async function handleRouteDeviation(data: RouteDeviationAlertData): Promise<void> {
  const { journeyId, operatorId, deviationMeters, lat, lng, severity } = data;

  await prisma.safetyAlert.create({
    data: {
      journeyId,
      operatorId,
      alertType: 'ROUTE_DEVIATION',
      severity,
      data: { deviationMeters, lat, lng },
    },
  });

  const phones = await getPassengerPhones(journeyId);

  const journey = await prisma.journey.findUnique({
    where: { id: journeyId },
    include: { route: true },
  });

  const routeName = journey?.route
    ? `${journey.route.fromCity} to ${journey.route.toCity}`
    : 'your journey';

  const deviationKm = (deviationMeters / 1000).toFixed(1);
  const msg = `[Twende Safety] Route deviation detected on ${routeName}. Bus is ${deviationKm}km off route. We are monitoring the situation.`;

  for (const phone of phones) {
    await addSMSJob(phone, msg);
  }

  console.log(`[AlertsWorker] Route deviation alert: notified ${phones.length} passengers`);
}

async function handleNoSignal(data: NoSignalAlertData): Promise<void> {
  const { journeyId, operatorId, lastSeenAt, lastLat, lastLng } = data;

  await prisma.safetyAlert.create({
    data: {
      journeyId,
      operatorId,
      alertType: 'NO_SIGNAL',
      severity: 'WARNING',
      data: { lastSeenAt, lastLat, lastLng },
    },
  });

  console.log(`[AlertsWorker] No signal alert for journey ${journeyId}. Last seen: ${lastSeenAt}`);
}

async function handleUpdateComplianceScore(data: UpdateComplianceScoreData): Promise<void> {
  const { operatorId } = data;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [alertCount, criticalCount, ratings] = await Promise.all([
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
  ]);

  const avgRating =
    ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length : 5.0;

  // Score starts at 10, deductions for alerts and low ratings
  let score = 10.0;
  score -= alertCount * 0.3;
  score -= criticalCount * 1.0;
  score -= Math.max(0, (3.5 - avgRating) * 2);
  score = Math.max(0, Math.min(10, Math.round(score * 10) / 10));

  await prisma.operator.update({
    where: { id: operatorId },
    data: { complianceScore: score },
  });

  console.log(`[AlertsWorker] Compliance score updated for operator ${operatorId}: ${score}`);
}

export const alertsWorker = new Worker<AlertJobData>(
  QUEUE_NAME,
  async (job: Job<AlertJobData>) => {
    const { data } = job;

    console.log(`[AlertsWorker] Processing job ${job.id}: type=${data.type}`);

    switch (data.type) {
      case 'speeding':
        await handleSpeeding(data);
        break;
      case 'route_deviation':
        await handleRouteDeviation(data);
        break;
      case 'no_signal':
        await handleNoSignal(data);
        break;
      case 'update_compliance_score':
        await handleUpdateComplianceScore(data);
        break;
    }
  },
  {
    connection: redis,
    concurrency: 5,
  }
);

alertsWorker.on('completed', (job: Job<AlertJobData>) => {
  console.log(`[AlertsWorker] Job ${job.id} completed.`);
});

alertsWorker.on('failed', (job: Job<AlertJobData> | undefined, err: Error) => {
  console.error(`[AlertsWorker] Job ${job?.id} failed:`, err.message);
});
