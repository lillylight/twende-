import { NextResponse, type NextRequest } from 'next/server';

// ─── Security Headers (inlined to avoid importing Node.js modules in Edge) ───

const SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
};

// ─── In-memory rate limiter (Edge-compatible, no Redis) ──────────────────────

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function rateLimitByIP(
  request: NextRequest,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1';

  const now = Date.now();
  const key = `${ip}:${request.nextUrl.pathname}`;
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  entry.count++;
  const allowed = entry.count <= limit;
  return { allowed, remaining: Math.max(0, limit - entry.count), resetAt: entry.resetAt };
}

// Periodically clean up expired entries (every 60s)
let lastCleanup = Date.now();
function cleanupStore() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
}

// ─── Rate limit config ───────────────────────────────────────────────────────

const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  '/api/auth': { limit: 20, windowMs: 60_000 },
  '/api/bookings': { limit: 50, windowMs: 60_000 },
  '/api/tracking/position': { limit: 200, windowMs: 60_000 },
  '/api/ussd': { limit: 30, windowMs: 60_000 },
  '/api/webhooks': { limit: 100, windowMs: 60_000 },
  '/api': { limit: 100, windowMs: 60_000 },
};

function getRateLimitConfig(pathname: string): { limit: number; windowMs: number } | null {
  if (pathname === '/api/health' || pathname.startsWith('/api/health/')) {
    return null;
  }

  if (pathname.startsWith('/api/auth')) return RATE_LIMITS['/api/auth'];
  if (pathname === '/api/bookings' || pathname.startsWith('/api/bookings/'))
    return RATE_LIMITS['/api/bookings'];
  if (pathname === '/api/tracking/position') return RATE_LIMITS['/api/tracking/position'];
  if (pathname.startsWith('/api/ussd')) return RATE_LIMITS['/api/ussd'];
  if (pathname.startsWith('/api/webhooks')) return RATE_LIMITS['/api/webhooks'];
  if (pathname.startsWith('/api/')) return RATE_LIMITS['/api'];

  return null;
}

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  'https://twende.co.zm',
  'https://www.twende.co.zm',
];

function getCORSHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin') ?? '';
  const isAllowed =
    ALLOWED_ORIGINS.includes(origin) ||
    (process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost'));

  if (!isAllowed) {
    return {};
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-csrf-token',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

export function middleware(request: NextRequest) {
  cleanupStore();

  const { pathname } = request.nextUrl;
  const isAPIRoute = pathname.startsWith('/api/');

  // Handle CORS preflight for API routes
  if (isAPIRoute && request.method === 'OPTIONS') {
    const corsHeaders = getCORSHeaders(request);
    return new NextResponse(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        ...SECURITY_HEADERS,
      },
    });
  }

  // Apply rate limiting for API routes
  if (isAPIRoute) {
    const rateLimitConfig = getRateLimitConfig(pathname);

    if (rateLimitConfig) {
      const result = rateLimitByIP(request, rateLimitConfig.limit, rateLimitConfig.windowMs);

      if (!result.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests. Please try again later.',
            },
            timestamp: new Date().toISOString(),
          },
          {
            status: 429,
            headers: {
              'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
              'X-RateLimit-Limit': rateLimitConfig.limit.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': result.resetAt.toString(),
              ...SECURITY_HEADERS,
            },
          }
        );
      }
    }
  }

  // Build response with security headers
  const response = NextResponse.next();

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  // Apply CORS headers for API routes
  if (isAPIRoute) {
    const corsHeaders = getCORSHeaders(request);
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (cesium, images, etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|cesium/).*)',
  ],
};
