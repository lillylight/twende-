import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { verifyRefreshToken, createSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Refresh token is required.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Check if the token is blacklisted
    const isBlacklisted = await redis.get(`blacklist:${refreshToken}`);
    if (isBlacklisted) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'TOKEN_REVOKED', message: 'This refresh token has been revoked.' },
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Invalid or expired refresh token.' },
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, phone: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found or account disabled.' },
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    // Blacklist the old refresh token (rotate tokens)
    await redis.set(`blacklist:${refreshToken}`, '1', 'EX', 7 * 24 * 60 * 60);

    const tokens = createSession(user.id, user.role, user.phone);

    return NextResponse.json(
      {
        success: true,
        data: { tokens },
        message: 'Token refreshed successfully.',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Auth] Token refresh error:', error);
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
