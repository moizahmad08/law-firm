import { prisma } from "@/lib/database/client";
import { withUserContext } from "@/lib/database/context";
import { recordAuthAudit } from "@/lib/auth/audit";
import { Role, BreakGlassStatus } from "@prisma/client";

export interface BreakGlassDetails {
  id: string;
  caseId: string;
  caseNumber: string;
  caseTitle: string;
  requesterName: string;
  justification: string;
  status: BreakGlassStatus;
  approvedByName?: string | null;
  approvedAt?: Date | null;
  expiresAt?: Date | null;
  createdAt: Date;
}

/**
 * Super Admin requests emergency break-glass override on a restricted case.
 * Leaves an immutable audit trail and requires dual-custody Office Admin approval.
 */
export async function requestBreakGlass({
  targetCaseId,
  requestedByUserId,
  justification,
}: {
  targetCaseId: string;
  requestedByUserId: string;
  justification: string;
}): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: requestedByUserId },
  });

  if (!user || user.role !== Role.SUPER_ADMIN) {
    throw new Error("Unauthorized: Only a Super Administrator may initiate a Break-Glass emergency request.");
  }

  if (!justification || justification.trim().length < 10) {
    throw new Error("A comprehensive operational or security justification is strictly required.");
  }

  const request = await withUserContext(requestedByUserId, async (tx) => {
    try {
      return await tx.breakGlassRequest.create({
        data: {
          targetCaseId,
          requestedByUserId,
          justification: justification.trim(),
          status: BreakGlassStatus.PENDING,
        },
      });
    } catch (err: any) {
      if (err?.code === "P2003") {
        throw new Error("Target case record not found.");
      }
      throw err;
    }
  });

  await recordAuthAudit({
    userId: requestedByUserId,
    action: "BREAK_GLASS_REQUESTED",
    metadata: {
      requestId: request.id,
      caseId: targetCaseId,
      justification: justification.trim(),
    },
  });

  return request.id;
}

/**
 * Office Administrator approves a pending emergency override under dual-custody governance.
 */
export async function approveBreakGlass({
  requestId,
  approvedByUserId,
  durationHours = 4,
}: {
  requestId: string;
  approvedByUserId: string;
  durationHours?: number;
}): Promise<boolean> {
  const request = await withUserContext(approvedByUserId, async (tx) => {
    return await tx.breakGlassRequest.findUnique({
      where: { id: requestId },
    });
  });

  if (!request) {
    throw new Error("Break-glass request not found.");
  }

  if (request.status !== BreakGlassStatus.PENDING) {
    throw new Error(`Cannot approve request in ${request.status} status.`);
  }

  // Strict Dual-Custody Check
  if (request.requestedByUserId === approvedByUserId) {
    throw new Error("Dual-custody violation: The requesting administrator cannot approve their own break-glass request.");
  }

  const approver = await prisma.user.findUnique({
    where: { id: approvedByUserId },
  });

  if (!approver || approver.role !== Role.OFFICE_ADMIN) {
    throw new Error("Unauthorized: Only an Office Administrator may approve an emergency Break-Glass override.");
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

  await withUserContext(approvedByUserId, async (tx) => {
    await tx.breakGlassRequest.update({
      where: { id: requestId },
      data: {
        status: BreakGlassStatus.APPROVED,
        approvedByUserId,
        approvedAt: now,
        expiresAt,
      },
    });
  });

  await recordAuthAudit({
    userId: approvedByUserId,
    action: "BREAK_GLASS_APPROVED",
    metadata: {
      requestId,
      caseId: request.targetCaseId,
      durationHours,
      expiresAt,
    },
  });

  return true;
}

/**
 * Revokes an active or pending break-glass emergency override immediately.
 */
export async function revokeBreakGlass({
  requestId,
  revokedByUserId,
  reason,
}: {
  requestId: string;
  revokedByUserId: string;
  reason: string;
}): Promise<boolean> {
  const request = await withUserContext(revokedByUserId, async (tx) => {
    return await tx.breakGlassRequest.findUnique({
      where: { id: requestId },
    });
  });

  if (!request) {
    throw new Error("Break-glass request not found.");
  }

  await withUserContext(revokedByUserId, async (tx) => {
    await tx.breakGlassRequest.update({
      where: { id: requestId },
      data: {
        status: BreakGlassStatus.REVOKED,
        revokedAt: new Date(),
      },
    });
  });

  await recordAuthAudit({
    userId: revokedByUserId,
    action: "BREAK_GLASS_REVOKED",
    metadata: {
      requestId,
      caseId: request.targetCaseId,
      reason: reason.trim(),
    },
  });

  return true;
}
