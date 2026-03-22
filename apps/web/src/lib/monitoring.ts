import { redis } from './redis';

const METRICS_PREFIX = 'metrics:';
const LATENCY_PREFIX = `${METRICS_PREFIX}latency:`;
const ERROR_PREFIX = `${METRICS_PREFIX}errors:`;
const ERROR_COUNT_PREFIX = `${METRICS_PREFIX}error_count:`;

const startTime = Date.now();

// ─── API Latency Tracking ─────────────────────────────────────────────────────

export async function trackAPILatency(
  route: string,
  method: string,
  durationMs: number
): Promise<void> {
  const key = `${LATENCY_PREFIX}${method}:${route}`;
  const now = Date.now();
  const member = `${now}:${durationMs}`;

  try {
    const pipeline = redis.pipeline();
    pipeline.zadd(key, durationMs, member);
    // Keep only last hour of data
    const oneHourAgo = now - 60 * 60 * 1000;
    pipeline.zremrangebyscore(key, 0, oneHourAgo);
    pipeline.expire(key, 7200); // 2 hour TTL
    await pipeline.exec();
  } catch (error) {
    console.error('[Monitoring] Failed to track latency:', error);
  }
}

export interface LatencyMetrics {
  p50: number;
  p95: number;
  p99: number;
  count: number;
  avgMs: number;
}

export async function getAPIMetrics(route?: string): Promise<Record<string, LatencyMetrics>> {
  const results: Record<string, LatencyMetrics> = {};

  try {
    let keys: string[];
    if (route) {
      keys = await redis.keys(`${LATENCY_PREFIX}*:${route}`);
    } else {
      keys = await redis.keys(`${LATENCY_PREFIX}*`);
    }

    for (const key of keys) {
      const routeKey = key.replace(LATENCY_PREFIX, '');
      const scores = await redis.zrangebyscore(key, '-inf', '+inf', 'WITHSCORES');

      if (scores.length === 0) continue;

      const latencies: number[] = [];
      for (let i = 1; i < scores.length; i += 2) {
        latencies.push(parseFloat(scores[i]));
      }

      latencies.sort((a, b) => a - b);
      const count = latencies.length;
      const sum = latencies.reduce((acc, v) => acc + v, 0);

      results[routeKey] = {
        p50: latencies[Math.floor(count * 0.5)] ?? 0,
        p95: latencies[Math.floor(count * 0.95)] ?? 0,
        p99: latencies[Math.floor(count * 0.99)] ?? 0,
        count,
        avgMs: Math.round(sum / count),
      };
    }
  } catch (error) {
    console.error('[Monitoring] Failed to get API metrics:', error);
  }

  return results;
}

// ─── Error Tracking ───────────────────────────────────────────────────────────

export async function trackError(route: string, error: Error): Promise<void> {
  const now = Date.now();
  const minuteKey = Math.floor(now / 60_000);

  try {
    const pipeline = redis.pipeline();

    // Increment error count for the current minute
    const countKey = `${ERROR_COUNT_PREFIX}${minuteKey}`;
    pipeline.incr(countKey);
    pipeline.expire(countKey, 3600); // 1 hour TTL

    // Store error detail
    const errorKey = `${ERROR_PREFIX}${route}`;
    const errorData = JSON.stringify({
      message: error.message,
      stack: error.stack?.slice(0, 500),
      timestamp: new Date(now).toISOString(),
    });
    pipeline.lpush(errorKey, errorData);
    pipeline.ltrim(errorKey, 0, 99); // Keep last 100 errors per route
    pipeline.expire(errorKey, 86400); // 24 hour TTL

    await pipeline.exec();
  } catch (err) {
    console.error('[Monitoring] Failed to track error:', err);
  }
}

export async function getErrorRate(windowMinutes: number): Promise<number> {
  const now = Date.now();
  const currentMinute = Math.floor(now / 60_000);

  try {
    let totalErrors = 0;

    const pipeline = redis.pipeline();
    for (let i = 0; i < windowMinutes; i++) {
      const minuteKey = currentMinute - i;
      pipeline.get(`${ERROR_COUNT_PREFIX}${minuteKey}`);
    }

    const results = await pipeline.exec();
    if (results) {
      for (const [, result] of results) {
        totalErrors += parseInt((result as string) ?? '0', 10);
      }
    }

    // Error rate per minute
    return windowMinutes > 0 ? totalErrors / windowMinutes : 0;
  } catch (error) {
    console.error('[Monitoring] Failed to get error rate:', error);
    return 0;
  }
}

// ─── System Metrics ───────────────────────────────────────────────────────────

export interface SystemMetrics {
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    rssFormatted: string;
    heapUsedFormatted: string;
  };
  uptime: number;
  uptimeFormatted: string;
  activeConnections: number;
}

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
}

export function getSystemMetrics(): SystemMetrics {
  const mem = process.memoryUsage();
  const uptimeMs = Date.now() - startTime;

  return {
    memoryUsage: {
      rss: mem.rss,
      heapTotal: mem.heapTotal,
      heapUsed: mem.heapUsed,
      external: mem.external,
      rssFormatted: formatBytes(mem.rss),
      heapUsedFormatted: formatBytes(mem.heapUsed),
    },
    uptime: uptimeMs,
    uptimeFormatted: formatUptime(uptimeMs),
    activeConnections: 0, // Placeholder: actual WebSocket count depends on server implementation
  };
}
