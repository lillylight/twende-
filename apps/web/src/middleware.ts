import { NextResponse, type NextRequest } from 'next/server';
import { getSecurityHeaders, rateLimitByIP } from './lib/security';

const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  '/api/auth': { limit: 20, windowMs: 60_000 },
  '/api/bookings': { limit: 50, windowMs: 60_000 },
  '/api/tracking/position': { limit: 200, windowMs: 60_000 },
  '/api/ussd': { limit: 30, windowMs: 60_000 },
  '/api/webhooks': { limit: 100, windowMs: 60_000 },
  '/api': { limit: 100, windowMs: 60_000 },
};

function getRateLimitConfig(pathname: string): { limit: number; windowMs: number } | null {
  // Skip health check
  if (pathname === '/api/health' || pathname.startsWith('/api/health/')) {
    return null;
  }

  if (pathname.startsWith('/api/auth')) {
    return RATE_LIMITS['/api/auth'];
  }
  if (pathname === '/api/bookings' || pathname.startsWith('/api/bookings/')) {
    return RATE_LIMITS['/api/bookings'];
  }
  if (pathname === '/api/tracking/position') {
    return RATE_LIMITS['/api/tracking/position'];
  }
  if (pathname.startsWith('/api/ussd')) {
    return RATE_LIMITS['/api/ussd'];
  }
  if (pathname.startsWith('/api/webhooks')) {
    return RATE_LIMITS['/api/webhooks'];
  }
  if (pathname.startsWith('/api/')) {
    return RATE_LIMITS['/api'];
  }

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAPIRoute = pathname.startsWith('/api/');

  // Handle CORS preflight for API routes
  if (isAPIRoute && request.method === 'OPTIONS') {
    const corsHeaders = getCORSHeaders(request);
    return new NextResponse(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        ...getSecurityHeaders(),
      },
    });
  }

  // Apply rate limiting for API routes
  if (isAPIRoute) {
    const rateLimitConfig = getRateLimitConfig(pathname);

    if (rateLimitConfig) {
      const result = await rateLimitByIP(request, rateLimitConfig.limit, rateLimitConfig.windowMs);

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
              ...getSecurityHeaders(),
            },
          }
        );
      }
    }
  }

  // Build response with security headers
  const response = NextResponse.next();

  // Apply security headers to all responses
  const securityHeaders = getSecurityHeaders();
  for (const [key, value] of Object.entries(securityHeaders)) {
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
