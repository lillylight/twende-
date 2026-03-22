import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { redis } from '@/lib/redis';

const VERIFICATION_PREFIX = 'ec:verify:';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/emergency-contacts/:id/verify
 * Verify an emergency contact using the 6-digit code sent via SMS.
 * Body: { code: string }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;

    const contact = await prisma.emergencyContact.findUnique({
      where: { id },
    });

    if (!contact) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Emergency contact not found.' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    if (contact.userId !== user.userId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'You can only verify your own emergency contacts.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    if (contact.isVerified) {
      return NextResponse.json(
        {
          success: true,
          data: { id: contact.id, isVerified: true, verifiedAt: contact.verifiedAt },
          message: 'This contact is already verified.',
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Verification code is required.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Check the code against Redis
    const redisKey = `${VERIFICATION_PREFIX}${id}`;
    const storedCode = await redis.get(redisKey);

    if (!storedCode) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CODE_EXPIRED',
            message:
              'Verification code has expired. Please request a new one by updating the contact.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    if (storedCode !== String(code).trim()) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_CODE', message: 'Invalid verification code.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Mark as verified
    const now = new Date();

    const updated = await prisma.emergencyContact.update({
      where: { id },
      data: {
        isVerified: true,
        verifiedAt: now,
      },
    });

    // Clean up the Redis key
    await redis.del(redisKey);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: updated.id,
          name: updated.name,
          phone: updated.phone,
          isVerified: updated.isVerified,
          verifiedAt: updated.verifiedAt,
        },
        message: 'Emergency contact verified successfully.',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[EmergencyContacts] Verify error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to verify emergency contact.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
