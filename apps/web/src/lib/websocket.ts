import Redis from 'ioredis';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PositionUpdate {
  journeyId: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  altitude: number | null;
  accuracy: number | null;
  timestamp: string;
}

export interface SafetyAlertBroadcast {
  journeyId: string;
  alertType: 'SPEEDING' | 'ROUTE_DEVIATION' | 'NO_SIGNAL' | 'SOS';
  severity: 'WARNING' | 'CRITICAL';
  data: Record<string, unknown>;
  timestamp: string;
}

// ─── Redis Channel Helpers ──────────────────────────────────────────────────

const TRACKING_CHANNEL_PREFIX = 'tracking:journey:live:';
const SAFETY_CHANNEL_PREFIX = 'safety:journey:';
const SOS_CHANNEL_PREFIX = 'sos:tracking:';
const CLIENT_SET_PREFIX = 'ws:journey:';
const USER_CONN_PREFIX = 'ws:user:';

const MAX_CONNECTIONS_PER_USER = 3;

function getTrackingChannel(journeyId: string): string {
  return `${TRACKING_CHANNEL_PREFIX}${journeyId}`;
}

function getSafetyChannel(journeyId: string): string {
  return `${SAFETY_CHANNEL_PREFIX}${journeyId}`;
}

function getSosChannel(journeyId: string): string {
  return `${SOS_CHANNEL_PREFIX}${journeyId}`;
}

function getClientSetKey(journeyId: string): string {
  return `${CLIENT_SET_PREFIX}${journeyId}:clients`;
}

function getUserConnKey(userId: string): string {
  return `${USER_CONN_PREFIX}${userId}:count`;
}

// ─── Connection Management ──────────────────────────────────────────────────

/**
 * Create a dedicated Redis client for pub/sub subscriptions.
 * ioredis requires a separate connection for subscriber mode.
 */
function createSubscriberClient(): Redis {
  return new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    retryStrategy(times: number) {
      if (times > 10) return null;
      return Math.min(times * 200, 5000);
    },
  });
}

/**
 * Create a dedicated Redis client for publishing messages.
 */
function createPublisherClient(): Redis {
  return new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    retryStrategy(times: number) {
      if (times > 10) return null;
      return Math.min(times * 200, 5000);
    },
  });
}

// Singleton publisher (reused across publishes)
const globalForPublisher = globalThis as unknown as { wsPublisher: Redis | undefined };
const publisher = globalForPublisher.wsPublisher ?? createPublisherClient();
if (process.env.NODE_ENV !== 'production') {
  globalForPublisher.wsPublisher = publisher;
}

// ─── Publish Functions ──────────────────────────────────────────────────────

/**
 * Publish a position update to the Redis pub/sub channel for a journey.
 * All SSE clients subscribed to this journey will receive the update.
 */
export async function publishPosition(
  journeyId: string,
  positionData: PositionUpdate
): Promise<void> {
  const channel = getTrackingChannel(journeyId);
  const payload = JSON.stringify({
    type: 'position',
    data: positionData,
  });

  await publisher.publish(channel, payload);
}

/**
 * Broadcast a safety alert to the Redis pub/sub channel for a journey.
 */
export async function broadcastSafetyAlert(
  journeyId: string,
  alertData: SafetyAlertBroadcast
): Promise<void> {
  const channel = getSafetyChannel(journeyId);
  const payload = JSON.stringify({
    type: 'safety_alert',
    data: alertData,
  });

  await publisher.publish(channel, payload);
}

/**
 * Publish a position update to the SOS monitoring channel.
 * Used when an SOS is active and positions need enhanced tracking.
 */
export async function publishSOSPosition(
  journeyId: string,
  positionData: PositionUpdate
): Promise<void> {
  const channel = getSosChannel(journeyId);
  const payload = JSON.stringify({
    type: 'sos_position',
    data: positionData,
  });

  await publisher.publish(channel, payload);
}

// ─── Subscribe Functions ────────────────────────────────────────────────────

/**
 * Subscribe to position updates for a journey.
 * Returns a subscriber client and the cleanup function.
 */
export async function subscribeToJourney(
  journeyId: string,
  callback: (message: string) => void
): Promise<{ subscriber: Redis; unsubscribe: () => Promise<void> }> {
  const subscriber = createSubscriberClient();
  const trackingChannel = getTrackingChannel(journeyId);
  const safetyChannel = getSafetyChannel(journeyId);

  subscriber.on('message', (_channel: string, message: string) => {
    callback(message);
  });

  await subscriber.subscribe(trackingChannel, safetyChannel);

  const unsubscribe = async () => {
    await subscriber.unsubscribe(trackingChannel, safetyChannel);
    subscriber.disconnect();
  };

  return { subscriber, unsubscribe };
}

// ─── Client Tracking ────────────────────────────────────────────────────────

/**
 * Register a client connection for a journey. Returns false if the user
 * has exceeded the max concurrent connections (3).
 */
export async function registerClient(
  journeyId: string,
  userId: string,
  clientId: string
): Promise<boolean> {
  const userConnKey = getUserConnKey(userId);
  const currentCount = await publisher.get(userConnKey);
  const count = currentCount ? parseInt(currentCount, 10) : 0;

  if (count >= MAX_CONNECTIONS_PER_USER) {
    return false;
  }

  // Increment user connection count with a TTL (1 hour)
  await publisher.incr(userConnKey);
  await publisher.expire(userConnKey, 3600);

  // Add client to the journey's client set
  const clientSetKey = getClientSetKey(journeyId);
  await publisher.sadd(clientSetKey, `${userId}:${clientId}`);
  await publisher.expire(clientSetKey, 3600);

  return true;
}

/**
 * Unregister a client connection on disconnect. Decrements the user's
 * connection count and removes the client from the journey's client set.
 */
export async function unregisterClient(
  journeyId: string,
  userId: string,
  clientId: string
): Promise<void> {
  const userConnKey = getUserConnKey(userId);
  const newCount = await publisher.decr(userConnKey);

  // Clean up if count dropped to 0 or below
  if (newCount <= 0) {
    await publisher.del(userConnKey);
  }

  const clientSetKey = getClientSetKey(journeyId);
  await publisher.srem(clientSetKey, `${userId}:${clientId}`);

  // Clean up the set if empty
  const remaining = await publisher.scard(clientSetKey);
  if (remaining === 0) {
    await publisher.del(clientSetKey);
  }
}

/**
 * Get the number of connected clients for a journey.
 */
export async function getClientCount(journeyId: string): Promise<number> {
  const clientSetKey = getClientSetKey(journeyId);
  return publisher.scard(clientSetKey);
}
