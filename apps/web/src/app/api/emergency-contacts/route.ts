import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { redis } from '@/lib/redis';
import { sendSMS } from '@/lib/sms';
import { formatZambianPhone } from '@/lib/utils';

const MAX_CONTACTS_PER_USER = 5;
const VERIFICATION_CODE_TTL = 600; // 10 minutes
const VERIFICATION_PREFIX = 'ec:verify:';

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * GET /api/emergency-contacts
 * List the authenticated user's emergency contacts.
 */
export async function GET(request: NextRequest) {
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

    const contacts = await prisma.emergencyContact.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      {
        success: true,
        data: contacts,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[EmergencyContacts] List error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch emergency contacts.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/emergency-contacts
 * Add an emergency contact (max 5 per user).
 * Body: { name: string, phone: string, relationship?: string }
 * Sends a verification SMS to the contact's phone.
 */
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

    const body = await request.json();
    const { name, phone, relationship } = body;

    if (!name || !phone) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'name and phone are required.' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Check max contacts limit
    const existingCount = await prisma.emergencyContact.count({
      where: { userId: user.userId },
    });

    if (existingCount >= MAX_CONTACTS_PER_USER) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'LIMIT_REACHED',
            message: `You can have a maximum of ${MAX_CONTACTS_PER_USER} emergency contacts.`,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const formattedPhone = formatZambianPhone(phone);

    // Create the contact
    const contact = await prisma.emergencyContact.create({
      data: {
        userId: user.userId,
        name: String(name).trim(),
        phone: formattedPhone,
        relationship: relationship ? String(relationship).trim() : null,
        isVerified: false,
      },
    });

    // Generate and store verification code in Redis
    const code = generateVerificationCode();
    const redisKey = `${VERIFICATION_PREFIX}${contact.id}`;
    await redis.set(redisKey, code, 'EX', VERIFICATION_CODE_TTL);

    // Send verification SMS
    await sendSMS(
      formattedPhone,
      `Twende Zambia: You have been added as an emergency contact. Your verification code is ${code}. This code expires in 10 minutes.`
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          id: contact.id,
          name: contact.name,
          phone: contact.phone,
          relationship: contact.relationship,
          isVerified: contact.isVerified,
          createdAt: contact.createdAt,
        },
        message: 'Emergency contact added. A verification code has been sent to their phone.',
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[EmergencyContacts] Create error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to add emergency contact.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
