import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sendNotification, NotificationType } from '@/lib/notifications';

export async function POST(request: NextRequest) {
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
    const notificationType = body.type as NotificationType | undefined;

    // Default to JOURNEY_UPDATE for test
    const type =
      notificationType && Object.values(NotificationType).includes(notificationType)
        ? notificationType
        : NotificationType.JOURNEY_UPDATE;

    const message =
      body.message ??
      `[Twende Test] This is a test notification. Your notification settings are working correctly. Type: ${type}`;

    const result = await sendNotification(user.userId, type, message);

    return NextResponse.json({
      success: true,
      data: {
        sent: result.sent,
        channels: result.channels,
        type,
      },
      message: result.sent
        ? `Test notification sent via: ${result.channels.join(', ')}`
        : 'Notification not sent. This notification type may be disabled in your preferences.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[NotificationTest] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to send test notification.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
