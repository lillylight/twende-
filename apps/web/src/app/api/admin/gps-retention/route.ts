import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog, AuditAction } from '@/lib/audit';
import { anonymizeOldGPSData, enforceRetentionPolicy, getRetentionStatus } from '@/lib/gps-privacy';

/**
 * GET: Get GPS data retention status - count of records by age bracket.
 * Restricted to RTSA_OFFICER and ADMIN roles.
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

    if (user.role !== 'RTSA_OFFICER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin or RTSA officials only.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const status = await getRetentionStatus();

    return NextResponse.json(
      {
        success: true,
        data: {
          ...status,
          policy: {
            anonymizationThresholdDays: 90,
            deletionThresholdDays: 365,
          },
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[GPS Retention] Status error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get retention status.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST: Trigger GPS data retention job.
 * Runs anonymization (90+ day records) and deletion (365+ day records).
 * Restricted to RTSA_OFFICER and ADMIN roles.
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

    if (user.role !== 'RTSA_OFFICER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin or RTSA officials only.' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    // Step 1: Anonymize old GPS data (> 90 days)
    const anonymizationResult = await anonymizeOldGPSData();

    // Audit log for anonymization
    await createAuditLog({
      userId: user.userId,
      userRole: user.role,
      action: AuditAction.GPS_ANONYMIZE,
      resource: 'gps_log',
      details: {
        anonymizedCount: anonymizationResult.anonymizedCount,
        cutoffDate: anonymizationResult.cutoffDate.toISOString(),
      },
      request,
    });

    // Step 2: Delete very old anonymized data (> 365 days)
    const deletionResult = await enforceRetentionPolicy();

    // Audit log for deletion
    await createAuditLog({
      userId: user.userId,
      userRole: user.role,
      action: AuditAction.GPS_RETENTION,
      resource: 'gps_log',
      details: {
        deletedCount: deletionResult.deletedCount,
        cutoffDate: deletionResult.cutoffDate.toISOString(),
      },
      request,
    });

    // Get updated status
    const status = await getRetentionStatus();

    return NextResponse.json(
      {
        success: true,
        data: {
          anonymization: {
            recordsAnonymized: anonymizationResult.anonymizedCount,
            cutoffDate: anonymizationResult.cutoffDate.toISOString(),
          },
          deletion: {
            recordsDeleted: deletionResult.deletedCount,
            cutoffDate: deletionResult.cutoffDate.toISOString(),
          },
          currentStatus: status,
        },
        message: `Retention job completed. ${anonymizationResult.anonymizedCount} records anonymized, ${deletionResult.deletedCount} records deleted.`,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[GPS Retention] Job error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to run retention job.' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
