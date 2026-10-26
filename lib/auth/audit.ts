import { prisma } from "@/lib/database/client";
import { Prisma } from "@prisma/client";

const SENSITIVE_PATTERNS = [
  "password",
  "secret",
  "token",
  "hash",
  "credential",
  "auth",
  "apikey",
];

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return SENSITIVE_PATTERNS.some((pattern) => lower.includes(pattern));
}

function sanitizeData(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export interface RecordAuthAuditParams {
  userId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function recordAuthAudit({
  userId,
  action,
  metadata = {},
  ipAddress = "127.0.0.1",
  userAgent = "internal-auth-engine",
}: RecordAuthAuditParams): Promise<void> {
  try {
    const cleanMetadata = sanitizeData(metadata) as Record<string, unknown>;

    await prisma.auditEvent.create({
      data: {
        userId: userId ?? null,
        action,
        entityType: "AUTHENTICATION",
        entityId: userId ?? "ANONYMOUS",
        beforeState: {} as Prisma.InputJsonValue,
        afterState: cleanMetadata as Prisma.InputJsonValue,
        ipAddress: ipAddress ?? "127.0.0.1",
        userAgent: userAgent ?? "unknown",
      },
    });
  } catch (error) {
    // Non-throwing to prevent breaking login on transient audit issues,
    // but logged without secrets
    console.error(`[AUDIT_FAILURE] Action ${action} could not be persisted:`, error);
  }
}
