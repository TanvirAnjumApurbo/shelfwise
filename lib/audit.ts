import { db } from "@/database/drizzle";
import { auditLogs } from "@/database/audit-schema";
import { NextRequest } from "next/server";

interface AuditLogData {
  action: string;
  actorType: "USER" | "ADMIN" | "SYSTEM";
  actorId?: string;
  targetUserId?: string;
  targetBookId?: string;
  targetRequestId?: string;
  metadata?: Record<string, any>;
  request?: NextRequest;
}

export async function createAuditLog(data: AuditLogData) {
  try {
    const auditEntry = {
      action: data.action as any,
      actorType: data.actorType as any,
      actorId: data.actorId || null,
      targetUserId: data.targetUserId || null,
      targetBookId: data.targetBookId || null,
      targetRequestId: data.targetRequestId || null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      ipAddress: data.request
        ? data.request.headers.get("x-forwarded-for") ||
          data.request.headers.get("x-real-ip") ||
          "127.0.0.1"
        : null,
      userAgent: data.request ? data.request.headers.get("user-agent") : null,
    };

    await db.insert(auditLogs).values(auditEntry);
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw - audit logging should not break the main flow
  }
}
