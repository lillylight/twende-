import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

let redisClient: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          return new Error('Max reconnection attempts reached');
        }
        return Math.min(retries * 100, 3000);
      },
    },
  });

  redisClient.on('error', (err) => console.error('Redis Client Error:', err));
  redisClient.on('connect', () => console.log('✅ Connected to Redis'));

  await redisClient.connect();
  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    redisClient = null;
  }
}

// USSD Session Management
const USSD_SESSION_TTL = 60; // seconds
const USSD_SESSION_PREFIX = 'ussd:session:';

export async function getUssdSession(sessionId: string): Promise<any | null> {
  const client = await getRedisClient();
  const data = await client.get(`${USSD_SESSION_PREFIX}${sessionId}`);
  return data ? JSON.parse(data) : null;
}

export async function setUssdSession(sessionId: string, sessionData: any): Promise<void> {
  const client = await getRedisClient();
  await client.setEx(
    `${USSD_SESSION_PREFIX}${sessionId}`,
    USSD_SESSION_TTL,
    JSON.stringify(sessionData)
  );
}

export async function deleteUssdSession(sessionId: string): Promise<void> {
  const client = await getRedisClient();
  await client.del(`${USSD_SESSION_PREFIX}${sessionId}`);
}

// JWT Token Blacklist
const JWT_BLACKLIST_PREFIX = 'jwt:blacklist:';

export async function addToBlacklist(token: string): Promise<void> {
  const client = await getRedisClient();
  // 24 hour TTL for blacklist
  await client.setEx(`${JWT_BLACKLIST_PREFIX}${token}`, 86400, '1');
}

export async function isBlacklisted(token: string): Promise<boolean> {
  const client = await getRedisClient();
  const result = await client.get(`${JWT_BLACKLIST_PREFIX}${token}`);
  return result === '1';
}

// Rate Limiting
const RATE_LIMIT_PREFIX = 'ratelimit:';

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const client = await getRedisClient();
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  // Remove old entries
  await client.zRemRangeByScore(`${RATE_LIMIT_PREFIX}${key}`, 0, windowStart);

  // Count current requests
  const count = await client.zCard(`${RATE_LIMIT_PREFIX}${key}`);

  if (count >= limit) {
    return false;
  }

  // Add new request
  await client.zAdd(`${RATE_LIMIT_PREFIX}${key}`, { score: now, value: now.toString() });
  await client.expire(`${RATE_LIMIT_PREFIX}${key}`, windowSeconds);

  return true;
}

// Journey Position Cache
const JOURNEY_POSITION_PREFIX = 'journey:position:';

export async function setJourneyPosition(
  journeyId: string,
  position: { latitude: number; longitude: number; speed: number; heading: number; timestamp: Date }
): Promise<void> {
  const client = await getRedisClient();
  await client.hSet(`${JOURNEY_POSITION_PREFIX}${journeyId}`, {
    latitude: position.latitude.toString(),
    longitude: position.longitude.toString(),
    speed: position.speed.toString(),
    heading: position.heading.toString(),
    timestamp: position.timestamp.toISOString(),
  });
}

export async function getJourneyPosition(journeyId: string): Promise<any | null> {
  const client = await getRedisClient();
  const data = await client.hGetAll(`${JOURNEY_POSITION_PREFIX}${journeyId}`);
  if (!data || Object.keys(data).length === 0) {
    return null;
  }
  return {
    latitude: parseFloat(data.latitude),
    longitude: parseFloat(data.longitude),
    speed: parseFloat(data.speed),
    heading: parseFloat(data.heading),
    timestamp: new Date(data.timestamp),
  };
}

// WebSocket Room Tracking
const WS_ROOM_PREFIX = 'ws:room:';

export async function addToRoom(roomId: string, socketId: string): Promise<void> {
  const client = await getRedisClient();
  await client.sAdd(`${WS_ROOM_PREFIX}${roomId}`, socketId);
}

export async function removeFromRoom(roomId: string, socketId: string): Promise<void> {
  const client = await getRedisClient();
  await client.sRem(`${WS_ROOM_PREFIX}${roomId}`, socketId);
}

export async function getRoomMembers(roomId: string): Promise<string[]> {
  const client = await getRedisClient();
  return client.sMembers(`${WS_ROOM_PREFIX}${roomId}`);
}

// Booking Reservation Locks
const BOOKING_LOCK_PREFIX = 'booking:lock:';
const BOOKING_LOCK_TTL = 600; // 10 minutes

export async function acquireBookingLock(journeyId: string, seatNumber: number): Promise<boolean> {
  const client = await getRedisClient();
  const key = `${BOOKING_LOCK_PREFIX}${journeyId}:${seatNumber}`;

  const result = await client.set(key, '1', {
    NX: true,
    EX: BOOKING_LOCK_TTL,
  });

  return result === 'OK';
}

export async function releaseBookingLock(journeyId: string, seatNumber: number): Promise<void> {
  const client = await getRedisClient();
  await client.del(`${BOOKING_LOCK_PREFIX}${journeyId}:${seatNumber}`);
}

export async function isSeatLocked(journeyId: string, seatNumber: number): Promise<boolean> {
  const client = await getRedisClient();
  const exists = await client.exists(`${BOOKING_LOCK_PREFIX}${journeyId}:${seatNumber}`);
  return exists === 1;
}
