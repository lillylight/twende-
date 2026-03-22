import { type NextRequest } from 'next/server';
import { redis } from './redis';
import crypto from 'crypto';

// ─── Security Headers ─────────────────────────────────────────────────────────

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com https://cesium.com https://*.cesium.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cesium.com",
  "img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.cesium.com https://*.tile.openstreetmap.org",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://*.googleapis.com https://*.google.com https://*.cesium.com wss://* ws://*",
  "frame-src 'self' https://maps.googleapis.com",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export function getSecurityHeaders(): Record<string, string> {
  return {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': CSP_DIRECTIVES,
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
  };
}

// ─── Input Sanitization ───────────────────────────────────────────────────────

const XSS_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /&/g, replacement: '&amp;' },
  { pattern: /</g, replacement: '&lt;' },
  { pattern: />/g, replacement: '&gt;' },
  { pattern: /"/g, replacement: '&quot;' },
  { pattern: /'/g, replacement: '&#x27;' },
  { pattern: /\//g, replacement: '&#x2F;' },
  { pattern: /`/g, replacement: '&#96;' },
];

const DANGEROUS_PATTERNS = [
  /javascript\s*:/gi,
  /on\w+\s*=/gi,
  /<script[\s>]/gi,
  /<\/script>/gi,
  /eval\s*\(/gi,
  /expression\s*\(/gi,
  /vbscript\s*:/gi,
  /data\s*:\s*text\/html/gi,
];

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  let sanitized = input.trim();

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Strip dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

  // Encode HTML entities
  for (const { pattern, replacement } of XSS_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }

  return sanitized;
}

// ─── CSRF Protection ──────────────────────────────────────────────────────────

const CSRF_SECRET =
  process.env.CSRF_SECRET ||
  (() => {
    throw new Error('Missing required env: CSRF_SECRET');
  })();
const CSRF_COOKIE_NAME = 'twende-csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

export function generateCSRFToken(): string {
  const tokenValue = crypto.randomBytes(32).toString('hex');
  const timestamp = Date.now().toString(36);
  const payload = `${tokenValue}.${timestamp}`;
  const signature = crypto.createHmac('sha256', CSRF_SECRET).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

export function validateCSRFToken(request: NextRequest): boolean {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) {
    return false;
  }

  // Double-submit cookie pattern: both must match
  if (cookieToken !== headerToken) {
    return false;
  }

  // Validate token structure and signature
  const parts = cookieToken.split('.');
  if (parts.length !== 3) {
    return false;
  }

  const [tokenValue, timestamp, signature] = parts;
  const payload = `${tokenValue}.${timestamp}`;
  const expectedSignature = crypto.createHmac('sha256', CSRF_SECRET).update(payload).digest('hex');

  if (signature !== expectedSignature) {
    return false;
  }

  // Check token age (max 24 hours)
  const tokenAge = Date.now() - parseInt(timestamp, 36);
  const MAX_AGE_MS = 24 * 60 * 60 * 1000;
  if (tokenAge > MAX_AGE_MS || tokenAge < 0) {
    return false;
  }

  return true;
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  return '127.0.0.1';
}

async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - windowMs;
  const redisKey = `rate_limit:${key}`;

  try {
    const pipeline = redis.pipeline();

    // Remove expired entries
    pipeline.zremrangebyscore(redisKey, 0, windowStart);

    // Add the current request
    pipeline.zadd(redisKey, now, `${now}:${crypto.randomBytes(4).toString('hex')}`);

    // Count requests in the window
    pipeline.zcard(redisKey);

    // Set expiry on the key
    pipeline.pexpire(redisKey, windowMs);

    const results = await pipeline.exec();

    if (!results) {
      // Redis error - allow the request (fail open)
      return { allowed: true, remaining: limit, resetAt: now + windowMs };
    }

    const count = (results[2]?.[1] as number) ?? 0;
    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);
    const resetAt = now + windowMs;

    return { allowed, remaining, resetAt };
  } catch (error) {
    console.error('[Security] Rate limit check failed:', error);
    // Fail open - allow request if Redis is unavailable
    return { allowed: true, remaining: limit, resetAt: now + windowMs };
  }
}

export async function rateLimitByIP(
  request: NextRequest,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const ip = getClientIP(request);
  return rateLimit(`ip:${ip}`, limit, windowMs);
}

export async function rateLimitByUser(
  userId: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  return rateLimit(`user:${userId}`, limit, windowMs);
}
