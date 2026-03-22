import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { getCurrentUser } from '@/lib/auth';
import { getSystemMetrics, getAPIMetrics, getErrorRate } from '@/lib/monitoring';
import { smsQueue } from '@/lib/queues/sms.queue';
import { alertsQueue } from '@/lib/queues/alerts.queue';
import { paymentsQueue } from '@/lib/queues/payments.queue';

interface HealthCheck {
  status: 'ok' | 'error';
  latencyMs: number;
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', latencyMs: Date.now() - start };
  } catch {
    return { status: 'error', latencyMs: Date.now() - start };
  }
}

async function checkRedis(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const result = await redis.ping();
    return {
      status: result === 'PONG' ? 'ok' : 'error',
      latencyMs: Date.now() - start,
    };
  } catch {
    return { status: 'error', latencyMs: Date.now() - start };
  }
}

async function getQueueSizes(): Promise<
  Record<string, { waiting: number; active: number; delayed: number; failed: number }>
> {
  try {
    const [smsWaiting, smsActive, smsDelayed, smsFailed] = await Promise.all([
      smsQueue.getWaitingCount(),
      smsQueue.getActiveCount(),
      smsQueue.getDelayedCount(),
      smsQueue.getFailedCount(),
    ]);

    const [alertsWaiting, alertsActive, alertsDelayed, alertsFailed] = await Promise.all([
      alertsQueue.getWaitingCount(),
      alertsQueue.getActiveCount(),
      alertsQueue.getDelayedCount(),
      alertsQueue.getFailedCount(),
    ]);

    const [paymentsWaiting, paymentsActive, paymentsDelayed, paymentsFailed] = await Promise.all([
      paymentsQueue.getWaitingCount(),
      paymentsQueue.getActiveCount(),
      paymentsQueue.getDelayedCount(),
      paymentsQueue.getFailedCount(),
    ]);

    return {
      sms: { waiting: smsWaiting, active: smsActive, delayed: smsDelayed, failed: smsFailed },
      alerts: {
        waiting: alertsWaiting,
        active: alertsActive,
        delayed: alertsDelayed,
        failed: alertsFailed,
      },
      payments: {
        waiting: paymentsWaiting,
        active: paymentsActive,
        delayed: paymentsDelayed,
        failed: paymentsFailed,
      },
    };
  } catch {
    return {
      sms: { waiting: 0, active: 0, delayed: 0, failed: 0 },
      alerts: { waiting: 0, active: 0, delayed: 0, failed: 0 },
      payments: { waiting: 0, active: 0, delayed: 0, failed: 0 },
    };
  }
}

async function getActiveJourneysCount(): Promise<number> {
  try {
    return await prisma.journey.count({
      where: { status: { in: ['BOARDING', 'EN_ROUTE'] } },
    });
  } catch {
    return 0;
  }
}

async function getGPSUpdateRate(): Promise<number> {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const count = await prisma.gPSLog.count({
      where: { createdAt: { gte: fiveMinutesAgo } },
    });
    // Updates per minute over the last 5 minutes
    return Math.round(count / 5);
  } catch {
    return 0;
  }
}

const startTime = Date.now();

export async function GET(request: NextRequest) {
  // Require RTSA or admin authentication
  const user = await getCurrentUser(request);
  if (!user || !['RTSA_OFFICIAL', 'OPERATOR_ADMIN'].includes(user.role)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Detailed health check requires RTSA or admin access.',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 403 }
    );
  }

  const [database, redisCheck, queueSizes, activeJourneys, gpsUpdateRate, apiMetrics, errorRate] =
    await Promise.all([
      checkDatabase(),
      checkRedis(),
      getQueueSizes(),
      getActiveJourneysCount(),
      getGPSUpdateRate(),
      getAPIMetrics(),
      getErrorRate(5),
    ]);

  const systemMetrics = getSystemMetrics();

  const allOk = database.status === 'ok' && redisCheck.status === 'ok';
  const anyDown = database.status === 'error' && redisCheck.status === 'error';

  let overallStatus: 'ok' | 'degraded' | 'down';
  if (allOk) {
    overallStatus = 'ok';
  } else if (anyDown) {
    overallStatus = 'down';
  } else {
    overallStatus = 'degraded';
  }

  const statusCode = overallStatus === 'ok' ? 200 : 503;

  return NextResponse.json(
    {
      status: overallStatus,
      checks: {
        database,
        redis: redisCheck,
        uptime: Date.now() - startTime,
      },
      queues: queueSizes,
      activeJourneys,
      gpsUpdateRate,
      memory: systemMetrics.memoryUsage,
      uptimeFormatted: systemMetrics.uptimeFormatted,
      apiMetrics,
      errorRatePerMinute: errorRate,
      version: process.env.APP_VERSION ?? '1.0.0',
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}
