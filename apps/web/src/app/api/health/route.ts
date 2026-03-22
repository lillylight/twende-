import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

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

const startTime = Date.now();

export async function GET() {
  const [database, redisCheck] = await Promise.all([checkDatabase(), checkRedis()]);

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
      version: process.env.APP_VERSION ?? '1.0.0',
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}
