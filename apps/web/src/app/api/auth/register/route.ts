import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, generateOTP, storeOTP, createSession } from '@/lib/auth';
import { sendSMS } from '@/lib/sms';
import { UserRole } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, firstName, lastName, password, role } = body;

    if (!phone || !firstName || !lastName || !password) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Phone, firstName, lastName, and password are required.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const allowedRoles: string[] = [UserRole.PASSENGER, UserRole.DRIVER, UserRole.OPERATOR];
    const userRole = role && allowedRoles.includes(role) ? role : UserRole.PASSENGER;

    const existingUser = await prisma.user.findUnique({ where: { phone } });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'USER_EXISTS', message: 'A user with this phone number already exists.' },
          timestamp: new Date().toISOString(),
        },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        phone,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        passwordHash,
        role: userRole,
        isActive: true,
        isVerified: false,
      },
    });

    // Generate and send OTP for phone verification
    const otpCode = generateOTP();
    await storeOTP(phone, otpCode);
    await sendSMS(phone, `[ZedPulse] Your verification code is: ${otpCode}. Valid for 5 minutes.`);

    // Create session tokens
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
        message:
          'Registration successful. Please verify your phone number with the OTP sent via SMS.',
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Auth] Registration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during registration.',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
