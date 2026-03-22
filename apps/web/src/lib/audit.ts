import { createHmac } from 'crypto';
import { NextRequest } from 'next/server';
import { prisma } from './prisma';

// ─── Audit Action Enum ─────────────────────────────────────────────────────

export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  REGISTER = 'REGISTER',
  BOOKING_CREATE = 'BOOKING_CREATE',
  BOOKING_CANCEL = 'BOOKING_CANCEL',
  PAYMENT_INITIATE = 'PAYMENT_INITIATE',
  PAYMENT_COMPLETE = 'PAYMENT_COMPLETE',
  SOS_TRIGGER = 'SOS_TRIGGER',
  SOS_RESOLVE = 'SOS_RESOLVE',
  OPERATOR_SUSPEND = 'OPERATOR_SUSPEND',
  OPERATOR_UNSUSPEND = 'OPERATOR_UNSUSPEND',
  GPS_ACCESS = 'GPS_ACCESS',
  GPS_ANONYMIZE = 'GPS_ANONYMIZE',
  GPS_RETENTION = 'GPS_RETENTION',
  RTSA_ACTION = 'RTSA_ACTION',
  JOURNEY_CREATE = 'JOURNEY_CREATE',
  JOURNEY_UPDATE = 'JOURNEY_UPDATE',
  VEHICLE_CREATE = 'VEHICLE_CREATE',
  VEHICLE_UPDATE = 'VEHICLE_UPDATE',
  DRIVER_CREATE = 'DRIVER_CREATE',
  DRIVER_UPDATE = 'DRIVER_UPDATE',
  AUDIT_EXPORT = 'AUDIT_EXPORT',
  AUDIT_VERIFY = 'AUDIT_VERIFY',
}

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CreateAuditLogParams {
  userId?: string;
  userRole?: string;
  action: AuditAction | string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  request?: NextRequest;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface AuditChainResult {
  valid: boolean;
  totalRecords: number;
  checkedRecords: number;
  firstBrokenAt?: string;
  brokenRecordId?: string;
}

// ─── HMAC Secret ───────────────────────────────────────────────────────────

const AUDIT_HMAC_SECRET =
  process.env.AUDIT_HMAC_SECRET ||
  (() => {
    throw new Error('Missing required env: AUDIT_HMAC_SECRET');
  })();

// ─── Helpers ───────────────────────────────────────────────────────────────

function computeHash(
  action: string,
  resource: string,
  resourceId: string | null,
  userId: string | null,
  timestamp: string,
  previousHash: string | null
): string {
  const payload = [
    action,
    resource,
    resourceId ?? '',
    userId ?? '',
    timestamp,
    previousHash ?? '',
  ].join('|');

  return createHmac('sha256', AUDIT_HMAC_SECRET).update(payload).digest('hex');
}

function extractIpAddress(request?: NextRequest): string | null {
  if (!request) return null;

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  return null;
}

function extractUserAgent(request?: NextRequest): string | null {
  if (!request) return null;
  return request.headers.get('user-agent') ?? null;
}

// ─── Core Functions ────────────────────────────────────────────────────────

/**
 * Create an audit log entry with HMAC-SHA256 hash chain.
 */
export async function createAuditLog(params: CreateAuditLogParams) {
  const { userId, userRole, action, resource, resourceId, details, request } = params;

  const ipAddress = extractIpAddress(request);
  const userAgent = extractUserAgent(request);

  // Get the hash of the most recent audit log entry
  const previousEntry = await prisma.auditLog.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { hash: true },
  });

  const previousHash = previousEntry?.hash ?? null;
  const timestamp = new Date().toISOString();

  const hash = computeHash(
    action,
    resource,
    resourceId ?? null,
    userId ?? null,
    timestamp,
    previousHash
  );

  const auditLog = await prisma.auditLog.create({
    data: {
      userId: userId ?? null,
      userRole: userRole ?? null,
      action,
      resource,
      resourceId: resourceId ?? null,
      details: details ?? undefined,
      ipAddress,
      userAgent,
      previousHash,
      hash,
    },
  });

  return auditLog;
}

/**
 * Verify the hash chain integrity for a date range.
 * Returns information about whether the chain is intact.
 */
export async function verifyAuditChain(startDate: Date, endDate: Date): Promise<AuditChainResult> {
  const logs = await prisma.auditLog.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      action: true,
      resource: true,
      resourceId: true,
      userId: true,
      createdAt: true,
      previousHash: true,
      hash: true,
    },
  });

  if (logs.length === 0) {
    return { valid: true, totalRecords: 0, checkedRecords: 0 };
  }

  // For the first record in range, verify its own hash is correct
  // For subsequent records, also verify the previousHash chain
  let lastKnownHash: string | null = null;

  // Get the record immediately before the range to anchor the chain
  const anchorRecord = await prisma.auditLog.findFirst({
    where: {
      createdAt: { lt: startDate },
    },
    orderBy: { createdAt: 'desc' },
    select: { hash: true },
  });

  if (anchorRecord) {
    lastKnownHash = anchorRecord.hash;
  }

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];

    // Verify the previousHash matches the last known hash
    if (i === 0 && anchorRecord) {
      if (log.previousHash !== lastKnownHash) {
        return {
          valid: false,
          totalRecords: logs.length,
          checkedRecords: i + 1,
          firstBrokenAt: log.createdAt.toISOString(),
          brokenRecordId: log.id,
        };
      }
    } else if (i > 0) {
      if (log.previousHash !== lastKnownHash) {
        return {
          valid: false,
          totalRecords: logs.length,
          checkedRecords: i + 1,
          firstBrokenAt: log.createdAt.toISOString(),
          brokenRecordId: log.id,
        };
      }
    }

    // Verify the hash itself is correct
    const expectedHash = computeHash(
      log.action,
      log.resource,
      log.resourceId,
      log.userId,
      log.createdAt.toISOString(),
      log.previousHash
    );

    if (log.hash !== expectedHash) {
      return {
        valid: false,
        totalRecords: logs.length,
        checkedRecords: i + 1,
        firstBrokenAt: log.createdAt.toISOString(),
        brokenRecordId: log.id,
      };
    }

    lastKnownHash = log.hash;
  }

  return {
    valid: true,
    totalRecords: logs.length,
    checkedRecords: logs.length,
  };
}

/**
 * Search audit logs with filters and pagination.
 */
export async function searchAuditLogs(filters: AuditLogFilters) {
  const { userId, action, resource, startDate, endDate, page = 1, limit = 50 } = filters;

  const where: Record<string, unknown> = {};

  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (resource) where.resource = resource;

  if (startDate || endDate) {
    const createdAt: Record<string, Date> = {};
    if (startDate) createdAt.gte = startDate;
    if (endDate) createdAt.lte = endDate;
    where.createdAt = createdAt;
  }

  const skip = (page - 1) * limit;

  const [logs, totalItems] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  return {
    logs,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

/**
 * Export audit logs as JSON or CSV string.
 */
export async function exportAuditLogs(
  filters: Omit<AuditLogFilters, 'page' | 'limit'>,
  format: 'json' | 'csv'
): Promise<string> {
  const { userId, action, resource, startDate, endDate } = filters;

  const where: Record<string, unknown> = {};

  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (resource) where.resource = resource;

  if (startDate || endDate) {
    const createdAt: Record<string, Date> = {};
    if (startDate) createdAt.gte = startDate;
    if (endDate) createdAt.lte = endDate;
    where.createdAt = createdAt;
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  });

  if (format === 'json') {
    return JSON.stringify(logs, null, 2);
  }

  // CSV format
  const headers = [
    'id',
    'userId',
    'userRole',
    'action',
    'resource',
    'resourceId',
    'details',
    'ipAddress',
    'userAgent',
    'previousHash',
    'hash',
    'createdAt',
  ];

  const escapeCSV = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = logs.map((log) =>
    headers
      .map((header) => {
        const value = log[header as keyof typeof log];
        return escapeCSV(value);
      })
      .join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}
