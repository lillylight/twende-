import { redis } from '../redis';

const SESSION_PREFIX = 'ussd:session:';
const SESSION_TTL_SECONDS = 300; // 5 minutes

export interface USSDSession {
  sessionId: string;
  phoneNumber: string;
  currentMenu: string;
  step: number;
  data: Record<string, string>;
  createdAt: string;
}

export async function getSession(sessionId: string): Promise<USSDSession | null> {
  const key = `${SESSION_PREFIX}${sessionId}`;
  const raw = await redis.get(key);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as USSDSession;
  } catch {
    console.error(`[USSD] Failed to parse session ${sessionId}`);
    return null;
  }
}

export async function setSession(sessionId: string, data: USSDSession): Promise<void> {
  const key = `${SESSION_PREFIX}${sessionId}`;
  await redis.set(key, JSON.stringify(data), 'EX', SESSION_TTL_SECONDS);
}

export async function clearSession(sessionId: string): Promise<void> {
  const key = `${SESSION_PREFIX}${sessionId}`;
  await redis.del(key);
}
