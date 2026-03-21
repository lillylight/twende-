import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    // Extract the access token and blacklist it
    const authHeader = request.headers.get('Authorization');
    const accessToken = authHeader?.slice(7);

    if (accessToken) {
      // Blacklist the access token for its remaining TTL (15 minutes max)
      await redis.set(`blacklist:${accessToken}`, '1', 'EX', 15 * 60);
    }

    // Also blacklist the refresh token if provided in the body
    try {
      const body = await request.json();
      if (body.refreshToken) {
        await redis.set(`blacklist:${body.refreshToken}`, '1', 'EX', 7 * 24 * 60 * 60);
      }
    } catch {
      // Body may be empty; that's fine
    }

    return NextResponse.json(
      {
        success: true,
        data: null,
        message: 'Logged out successfully.',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Auth] Logout error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
