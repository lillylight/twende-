import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(): Redis {
  const client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    retryStrategy(times: number) {
      if (times > 10) {
        console.error('[Redis] Max reconnection attempts reached. Giving up.');
        return null;
      }
      const delay = Math.min(times * 200, 5000);
      console.warn(`[Redis] Reconnecting in ${delay}ms (attempt ${times})...`);
      return delay;
    },
  });

  client.on('connect', () => {
    console.log('[Redis] Connected successfully.');
  });

  client.on('error', (err: Error) => {
    console.error('[Redis] Connection error:', err.message);
  });

  client.on('close', () => {
    console.warn('[Redis] Connection closed.');
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

export default redis;
