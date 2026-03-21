import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyOTP, getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, code } = body;

    if (!phone || !code) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Phone and OTP code are required.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const isValid = await verifyOTP(phone, code);

    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_OTP', message: 'Invalid or expired OTP code.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Mark user as verified
    const user = await prisma.user.update({
      where: { phone },
      data: { isVerified: true },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          userId: user.id,
          phone: user.phone,
          isVerified: user.isVerified,
        },
        message: 'Phone number verified successfully.',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Auth] OTP verification error:', error);
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
