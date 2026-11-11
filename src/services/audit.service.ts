import { db } from "../db/index.js";
import { auditLogs } from "../db/schema/index.js";
import { logger } from "../config/logger.js";
import { FastifyRequest } from "fastify";

/**
 * Audit log entry for tracking changes
 */
export interface AuditLogEntry {
  tableName: string;
  recordId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "ACCESS";
  userId?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

/**
 * Log an audit event
 * Used for compliance, security, and debugging
 */
export async function logAuditEvent(event: AuditLogEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      tableName: event.tableName,
      recordId: event.recordId,
      action: event.action,
      userId: event.userId,
      oldData: event.oldData ? JSON.stringify(event.oldData) : null,
      newData: event.newData ? JSON.stringify(event.newData) : null,
      createdAt: new Date(),
    });

    // Also log to application logs
    logger.info(
      {
        table: event.tableName,
        recordId: event.recordId,
        action: event.action,
        userId: event.userId,
        correlationId: event.correlationId,
        ip: event.ipAddress,
      },
      `Audit: ${event.action} on ${event.tableName}`,
    );
  } catch (error) {
    logger.error({ err: error, event }, "Failed to log audit event");
    // Don't throw - audit failures shouldn't break the application
  }
}

/**
 * Log sensitive operation (login, password change, admin actions)
 */
export async function logSensitiveOperation(
  operation: string,
  userId: string,
  details: Record<string, any>,
  request: FastifyRequest,
): Promise<void> {
  try {
    logger.warn(
      {
        operation,
        userId,
        ip: request.ip,
        userAgent: request.headers["user-agent"],
        correlationId: request.id,
        ...details,
      },
      `Sensitive operation: ${operation}`,
    );
  } catch (error) {
    logger.error({ err: error }, "Failed to log sensitive operation");
  }
}

/**
 * Log authentication attempt
 */
export async function logAuthenticationAttempt(
  email: string,
  success: boolean,
  request: FastifyRequest,
  reason?: string,
): Promise<void> {
  try {
    const level = success ? "info" : "warn";
    const logFn = level === "info" ? logger.info : logger.warn;

    logFn(
      {
        email,
        success,
        ip: request.ip,
        userAgent: request.headers["user-agent"],
        correlationId: request.id,
        reason,
      },
      `Authentication attempt: ${success ? "SUCCESS" : "FAILED"}`,
    );
  } catch (error) {
    logger.error({ err: error }, "Failed to log authentication attempt");
  }
}

/**
 * Log authorization failure
 */
export async function logAuthorizationFailure(
  userId: string,
  resource: string,
  reason: string,
  request: FastifyRequest,
): Promise<void> {
  try {
    logger.warn(
      {
        userId,
        resource,
        reason,
        ip: request.ip,
        userAgent: request.headers["user-agent"],
        correlationId: request.id,
      },
      `Authorization failure: ${reason}`,
    );
  } catch (error) {
    logger.error({ err: error }, "Failed to log authorization failure");
  }
}

/**
 * Log data access (for sensitive operations)
 */
export async function logDataAccess(
  userId: string,
  dataType: string,
  recordId: string,
  request: FastifyRequest,
): Promise<void> {
  try {
    // Only log access to sensitive data types
    const sensitiveTypes = [
      "users",
      "addresses",
      "financial_data",
      "audit_logs",
    ];

    if (sensitiveTypes.includes(dataType)) {
      logger.debug(
        {
          userId,
          dataType,
          recordId,
          ip: request.ip,
          correlationId: request.id,
        },
        `Data access: ${dataType}`,
      );
    }
  } catch (error) {
    logger.error({ err: error }, "Failed to log data access");
  }
}

/**
 * Log API error for monitoring
 */
export async function logApiError(
  error: Error,
  statusCode: number,
  request: FastifyRequest,
  userId?: string,
): Promise<void> {
  try {
    const level = statusCode >= 500 ? "error" : "warn";
    const logFn = level === "error" ? logger.error : logger.warn;

    logFn(
      {
        error: error.message,
        statusCode,
        path: request.url,
        method: request.method,
        userId,
        ip: request.ip,
        correlationId: request.id,
      },
      `API error: ${statusCode}`,
    );
  } catch (error) {
    logger.error({ err: error }, "Failed to log API error");
  }
}

/**
 * Log security event
 */
export async function logSecurityEvent(
  event: string,
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  details: Record<string, any>,
  request?: FastifyRequest,
): Promise<void> {
  try {
    const logFn =
      severity === "CRITICAL" || severity === "HIGH"
        ? logger.error
        : severity === "MEDIUM"
          ? logger.warn
          : logger.info;

    logFn(
      {
        event,
        severity,
        ip: request?.ip,
        correlationId: request?.id,
        ...details,
      },
      `Security event [${severity}]: ${event}`,
    );
  } catch (error) {
    logger.error({ err: error }, "Failed to log security event");
  }
}

/**
 * Log configuration change
 */
export async function logConfigChange(
  section: string,
  key: string,
  oldValue: any,
  newValue: any,
  userId: string,
  request: FastifyRequest,
): Promise<void> {
  try {
    logger.warn(
      {
        section,
        key,
        oldValue: String(oldValue).substring(0, 50), // Truncate long values
        newValue: String(newValue).substring(0, 50),
        userId,
        ip: request.ip,
        correlationId: request.id,
      },
      `Configuration change: ${section}.${key}`,
    );
  } catch (error) {
    logger.error({ err: error }, "Failed to log configuration change");
  }
}

/**
 * Get audit trail for a record
 */
export async function getAuditTrail(
  tableName: string,
  recordId: string,
  limit: number = 100,
): Promise<any[]> {
  try {
    const { eq } = await import("drizzle-orm");
    const trail = await db
      .select()
      .from(auditLogs)
      .where(
        eq(auditLogs.tableName, tableName) && eq(auditLogs.recordId, recordId),
      )
      .orderBy(auditLogs.createdAt)
      .limit(limit);

    return trail;
  } catch (error) {
    logger.error({ err: error }, "Failed to retrieve audit trail");
    return [];
  }
}

/**
 * Get user activity log
 */
export async function getUserActivityLog(
  userId: string,
  limit: number = 100,
): Promise<any[]> {
  try {
    const { eq } = await import("drizzle-orm");
    const activity = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(auditLogs.createdAt)
      .limit(limit);

    return activity;
  } catch (error) {
    logger.error({ err: error }, "Failed to retrieve user activity");
    return [];
  }
}

/**
 * Audit logging helper for route handlers
 * Creates before/after audit entries
 */
export async function auditOperation(
  tableName: string,
  recordId: string,
  action: "CREATE" | "UPDATE" | "DELETE",
  oldData: Record<string, any> | null,
  newData: Record<string, any> | null,
  userId?: string,
  correlationId?: string,
): Promise<void> {
  await logAuditEvent({
    tableName,
    recordId,
    action,
    userId,
    oldData: oldData || undefined,
    newData: newData || undefined,
    correlationId,
  });
}
