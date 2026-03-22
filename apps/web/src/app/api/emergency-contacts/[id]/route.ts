import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { redis } from '@/lib/redis';
import { sendSMS } from '@/lib/sms';
import { formatZambianPhone } from '@/lib/utils';

const VERIFICATION_CODE_TTL = 600; // 10 minutes
const VERIFICATION_PREFIX = 'ec:verify:';

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/emergency-contacts/:id
 * Get a single emergency contact.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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
          error: { code: 'FORBIDDEN', message: 'You can only view your own emergency contacts.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: contact,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[EmergencyContacts] Get error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch emergency contact.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/emergency-contacts/:id
 * Update an emergency contact. Re-triggers verification if phone changes.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
          error: { code: 'FORBIDDEN', message: 'You can only update your own emergency contacts.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, phone, relationship } = body;

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      updateData.name = String(name).trim();
    }

    if (relationship !== undefined) {
      updateData.relationship = relationship ? String(relationship).trim() : null;
    }

    // If phone changed, reset verification and re-trigger
    let phoneChanged = false;
    let formattedPhone = contact.phone;

    if (phone !== undefined) {
      formattedPhone = formatZambianPhone(phone);
      if (formattedPhone !== contact.phone) {
        phoneChanged = true;
        updateData.phone = formattedPhone;
        updateData.isVerified = false;
        updateData.verifiedAt = null;
      }
    }

    const updated = await prisma.emergencyContact.update({
      where: { id },
      data: updateData,
    });

    // If phone changed, send new verification SMS
    if (phoneChanged) {
      const code = generateVerificationCode();
      const redisKey = `${VERIFICATION_PREFIX}${id}`;
      await redis.set(redisKey, code, 'EX', VERIFICATION_CODE_TTL);

      await sendSMS(
        formattedPhone,
        `Twende Zambia: You have been added as an emergency contact. Your verification code is ${code}. This code expires in 10 minutes.`
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: updated,
        message: phoneChanged
          ? 'Contact updated. A new verification code has been sent to the updated phone number.'
          : 'Contact updated successfully.',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[EmergencyContacts] Update error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update emergency contact.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/emergency-contacts/:id
 * Remove an emergency contact.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
          error: { code: 'FORBIDDEN', message: 'You can only delete your own emergency contacts.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    await prisma.emergencyContact.delete({ where: { id } });

    // Clean up any pending verification code
    const redisKey = `${VERIFICATION_PREFIX}${id}`;
    await redis.del(redisKey);

    return NextResponse.json(
      {
        success: true,
        data: { id },
        message: 'Emergency contact removed.',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[EmergencyContacts] Delete error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete emergency contact.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
