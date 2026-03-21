import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, password } = body;

    if (!phone || !password) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Phone and password are required.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid phone number or password.' },
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ACCOUNT_DISABLED',
            message: 'Your account has been disabled. Contact support.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);

    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid phone number or password.' },
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    const tokens = createSession(user.id, user.role, user.phone);

    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: user.id,
            phone: user.phone,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isVerified: user.isVerified,
            createdAt: user.createdAt,
          },
          tokens,
        },
        message: 'Login successful.',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Auth] Login error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred during login.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
