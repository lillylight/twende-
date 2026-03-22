import { prisma } from './prisma';
import { addSMSJob } from './queues/sms.queue';

// ─── Notification Types ───────────────────────────────────────────────────────

export enum NotificationType {
  BOOKING_CONFIRMATION = 'BOOKING_CONFIRMATION',
  JOURNEY_REMINDER = 'JOURNEY_REMINDER',
  SAFETY_ALERT = 'SAFETY_ALERT',
  SOS_ALERT = 'SOS_ALERT',
  PROMOTION = 'PROMOTION',
  JOURNEY_UPDATE = 'JOURNEY_UPDATE',
}

export const DELIVERY_METHODS = ['SMS', 'PUSH', 'BOTH'] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export interface NotificationPreferences {
  id: string;
  userId: string;
  bookingConfirmation: boolean;
  journeyReminder: boolean;
  safetyAlerts: boolean;
  sosAlerts: boolean;
  promotions: boolean;
  journeyUpdates: boolean;
  deliveryMethod: string;
  language: string;
}

// Map notification types to preference fields
const NOTIFICATION_PREFERENCE_MAP: Record<
  NotificationType,
  keyof Omit<NotificationPreferences, 'id' | 'userId' | 'deliveryMethod' | 'language'>
> = {
  [NotificationType.BOOKING_CONFIRMATION]: 'bookingConfirmation',
  [NotificationType.JOURNEY_REMINDER]: 'journeyReminder',
  [NotificationType.SAFETY_ALERT]: 'safetyAlerts',
  [NotificationType.SOS_ALERT]: 'sosAlerts',
  [NotificationType.PROMOTION]: 'promotions',
  [NotificationType.JOURNEY_UPDATE]: 'journeyUpdates',
};

// ─── Preference Functions ─────────────────────────────────────────────────────

export async function shouldNotify(
  userId: string,
  notificationType: NotificationType
): Promise<boolean> {
  // SOS alerts are always sent regardless of preferences
  if (notificationType === NotificationType.SOS_ALERT) {
    return true;
  }

  const prefs = await getNotificationPreferences(userId);
  const preferenceField = NOTIFICATION_PREFERENCE_MAP[notificationType];

  return prefs[preferenceField] as boolean;
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const existing = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  if (existing) {
    return existing;
  }

  // Create default preferences
  const created = await prisma.notificationPreference.create({
    data: {
      userId,
      bookingConfirmation: true,
      journeyReminder: true,
      safetyAlerts: true,
      sosAlerts: true,
      promotions: true,
      journeyUpdates: true,
      deliveryMethod: 'BOTH',
      language: 'en',
    },
  });

  return created;
}

export interface UpdatePreferencesInput {
  bookingConfirmation?: boolean;
  journeyReminder?: boolean;
  safetyAlerts?: boolean;
  sosAlerts?: boolean;
  promotions?: boolean;
  journeyUpdates?: boolean;
  deliveryMethod?: string;
  language?: string;
}

export async function updateNotificationPreferences(
  userId: string,
  prefs: UpdatePreferencesInput
): Promise<NotificationPreferences> {
  // Ensure SOS alerts cannot be disabled
  const safePrefs = { ...prefs };
  if (safePrefs.sosAlerts === false) {
    safePrefs.sosAlerts = true;
  }

  // Validate delivery method
  if (
    safePrefs.deliveryMethod &&
    !DELIVERY_METHODS.includes(safePrefs.deliveryMethod as DeliveryMethod)
  ) {
    throw new Error(`Invalid delivery method. Must be one of: ${DELIVERY_METHODS.join(', ')}`);
  }

  // Upsert: create if not exists, update if exists
  const updated = await prisma.notificationPreference.upsert({
    where: { userId },
    update: safePrefs,
    create: {
      userId,
      bookingConfirmation: safePrefs.bookingConfirmation ?? true,
      journeyReminder: safePrefs.journeyReminder ?? true,
      safetyAlerts: safePrefs.safetyAlerts ?? true,
      sosAlerts: true, // Always true
      promotions: safePrefs.promotions ?? true,
      journeyUpdates: safePrefs.journeyUpdates ?? true,
      deliveryMethod: safePrefs.deliveryMethod ?? 'BOTH',
      language: safePrefs.language ?? 'en',
    },
  });

  return updated;
}

// ─── Send Notification ────────────────────────────────────────────────────────

export async function sendNotification(
  userId: string,
  type: NotificationType,
  message: string
): Promise<{ sent: boolean; channels: string[] }> {
  const shouldSend = await shouldNotify(userId, type);

  if (!shouldSend) {
    return { sent: false, channels: [] };
  }

  const prefs = await getNotificationPreferences(userId);
  const channels: string[] = [];

  // Get user phone
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true },
  });

  if (!user) {
    return { sent: false, channels: [] };
  }

  const deliveryMethod = prefs.deliveryMethod as DeliveryMethod;

  // Send via SMS
  if (deliveryMethod === 'SMS' || deliveryMethod === 'BOTH') {
    await addSMSJob(user.phone, message);
    channels.push('SMS');
  }

  // Send via Push notification
  if (deliveryMethod === 'PUSH' || deliveryMethod === 'BOTH') {
    // Push notifications would be sent via a push service (e.g., Firebase)
    // For now, log and track the intent
    console.log(`[Notifications] Push notification for user ${userId}: ${type}`);
    channels.push('PUSH');
  }

  return { sent: true, channels };
}
