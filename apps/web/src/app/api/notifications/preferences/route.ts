import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  DELIVERY_METHODS,
} from '@/lib/notifications';

export async function GET(request: NextRequest) {
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

  try {
    const preferences = await getNotificationPreferences(user.userId);

    return NextResponse.json({
      success: true,
      data: preferences,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[NotificationPreferences] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve notification preferences.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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

  try {
    const body = await request.json();

    // Validate deliveryMethod if provided
    if (body.deliveryMethod && !DELIVERY_METHODS.includes(body.deliveryMethod)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid delivery method. Must be one of: ${DELIVERY_METHODS.join(', ')}`,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Warn if trying to disable SOS alerts
    if (body.sosAlerts === false) {
      body.sosAlerts = true;
    }

    // Only allow known fields
    const allowedFields = [
      'bookingConfirmation',
      'journeyReminder',
      'safetyAlerts',
      'sosAlerts',
      'promotions',
      'journeyUpdates',
      'deliveryMethod',
      'language',
    ];

    const sanitizedBody: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        sanitizedBody[field] = body[field];
      }
    }

    const updated = await updateNotificationPreferences(user.userId, sanitizedBody);

    return NextResponse.json({
      success: true,
      data: updated,
      message:
        body.sosAlerts === false
          ? 'Preferences updated. Note: SOS alerts cannot be disabled for safety reasons.'
          : 'Notification preferences updated successfully.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[NotificationPreferences] PUT error:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to update notification preferences.';
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
