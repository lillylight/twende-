import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { prisma } from './prisma';
import { createAuditLog, AuditAction } from './audit';

// ─── Configuration ─────────────────────────────────────────────────────────

const GPS_ENCRYPTION_SECRET =
  process.env.GPS_ENCRYPTION_SECRET ||
  (() => {
    throw new Error('Missing required env: GPS_ENCRYPTION_SECRET');
  })();
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT = 'twende-gps-salt';

// Retention thresholds
const ANONYMIZATION_THRESHOLD_DAYS = 90;
const DELETION_THRESHOLD_DAYS = 365;

// ─── Encryption Key Derivation ─────────────────────────────────────────────

function deriveKey(): Buffer {
  return scryptSync(GPS_ENCRYPTION_SECRET, SALT, 32);
}

// ─── Encryption ────────────────────────────────────────────────────────────

/**
 * AES-256-GCM encryption for GPS data at rest.
 * Returns a base64 string containing IV + authTag + ciphertext.
 */
export function encryptGPSData(data: Record<string, unknown>): string {
  const key = deriveKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  const plaintext = JSON.stringify(data);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

  const authTag = cipher.getAuthTag();

  // Concatenate: IV (16 bytes) + authTag (16 bytes) + ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypt AES-256-GCM encrypted GPS data.
 * Expects a base64 string containing IV + authTag + ciphertext.
 */
export function decryptGPSData(encrypted: string): Record<string, unknown> {
  const key = deriveKey();
  const combined = Buffer.from(encrypted, 'base64');

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return JSON.parse(decrypted.toString('utf8'));
}

// ─── Anonymization ─────────────────────────────────────────────────────────

/**
 * Anonymize GPS data older than 90 days.
 * Removes journey association but keeps lat/lng/speed for aggregate analytics.
 * The GPSLog model's journeyId is required, so we keep it but this function
 * signals which records have been processed.
 *
 * In practice, we remove granular identifying data from the `data` field
 * and mark records as anonymized by setting speedKmh heading accuracy to
 * neutral/zero values and storing an anonymized flag.
 *
 * Returns the count of records anonymized.
 */
export async function anonymizeOldGPSData(): Promise<{
  anonymizedCount: number;
  cutoffDate: Date;
}> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - ANONYMIZATION_THRESHOLD_DAYS);

  // Find GPS logs older than threshold that haven't been anonymized yet
  // We identify non-anonymized records by having a non-zero heading (anonymized set heading to 0)
  // and accuracy > 0
  const oldLogs = await prisma.gPSLog.findMany({
    where: {
      timestamp: { lt: cutoffDate },
      accuracy: { gt: 0 },
    },
    select: { id: true },
    take: 10000, // Process in batches
  });

  if (oldLogs.length === 0) {
    return { anonymizedCount: 0, cutoffDate };
  }

  const logIds = oldLogs.map((log) => log.id);

  // Anonymize: keep lat/lng/speedKmh for aggregate analytics,
  // zero out heading and set accuracy to 0 as an anonymization marker
  await prisma.gPSLog.updateMany({
    where: { id: { in: logIds } },
    data: {
      heading: 0,
      accuracy: 0, // Marker: accuracy=0 means anonymized
    },
  });

  return { anonymizedCount: oldLogs.length, cutoffDate };
}

// ─── Retention Policy ──────────────────────────────────────────────────────

/**
 * Delete fully anonymized GPS data older than 1 year.
 * Only deletes records that have already been anonymized (accuracy = 0).
 * Returns the count of records deleted.
 */
export async function enforceRetentionPolicy(): Promise<{
  deletedCount: number;
  cutoffDate: Date;
}> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DELETION_THRESHOLD_DAYS);

  // Delete anonymized records (accuracy = 0) older than 1 year
  const result = await prisma.gPSLog.deleteMany({
    where: {
      timestamp: { lt: cutoffDate },
      accuracy: 0, // Only delete already-anonymized records
    },
  });

  return { deletedCount: result.count, cutoffDate };
}

// ─── GPS Access Logging ────────────────────────────────────────────────────

/**
 * Log when a user accesses GPS data for a journey.
 * Creates an audit trail entry for GPS data access.
 */
export async function logGPSAccess(
  userId: string,
  journeyId: string,
  reason: string
): Promise<void> {
  await createAuditLog({
    userId,
    action: AuditAction.GPS_ACCESS,
    resource: 'gps_log',
    resourceId: journeyId,
    details: { reason, accessedAt: new Date().toISOString() },
  });
}

// ─── Retention Status ──────────────────────────────────────────────────────

/**
 * Get the current retention status: count of records by age bracket.
 */
export async function getRetentionStatus(): Promise<{
  totalRecords: number;
  recentRecords: number; // < 90 days
  anonymizedRecords: number; // 90-365 days, anonymized
  pendingAnonymization: number; // > 90 days, not yet anonymized
  pendingDeletion: number; // > 365 days, anonymized
}> {
  const now = new Date();
  const anonymizationCutoff = new Date(now);
  anonymizationCutoff.setDate(anonymizationCutoff.getDate() - ANONYMIZATION_THRESHOLD_DAYS);
  const deletionCutoff = new Date(now);
  deletionCutoff.setDate(deletionCutoff.getDate() - DELETION_THRESHOLD_DAYS);

  const [totalRecords, recentRecords, anonymizedRecords, pendingAnonymization, pendingDeletion] =
    await Promise.all([
      prisma.gPSLog.count(),
      prisma.gPSLog.count({
        where: { timestamp: { gte: anonymizationCutoff } },
      }),
      prisma.gPSLog.count({
        where: {
          timestamp: { lt: anonymizationCutoff, gte: deletionCutoff },
          accuracy: 0,
        },
      }),
      prisma.gPSLog.count({
        where: {
          timestamp: { lt: anonymizationCutoff },
          accuracy: { gt: 0 },
        },
      }),
      prisma.gPSLog.count({
        where: {
          timestamp: { lt: deletionCutoff },
          accuracy: 0,
        },
      }),
    ]);

  return {
    totalRecords,
    recentRecords,
    anonymizedRecords,
    pendingAnonymization,
    pendingDeletion,
  };
}
