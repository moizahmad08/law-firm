"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import {
  requestBreakGlass,
  approveBreakGlass,
  revokeBreakGlass,
} from "@/lib/admin/break-glass";

export type BreakGlassActionResult = {
  success: boolean;
  message: string;
  requestId?: string;
};

export async function requestBreakGlassAction(
  targetCaseId: string,
  justification: string
): Promise<BreakGlassActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.SUPER_ADMIN) {
    return {
      success: false,
      message: "Unauthorized: Only a Super Administrator may initiate emergency break-glass requests.",
    };
  }

  try {
    const requestId = await requestBreakGlass({
      targetCaseId,
      requestedByUserId: user.id,
      justification,
    });
    revalidatePath("/");
    return {
      success: true,
      message: "Emergency break-glass request submitted. Awaiting dual-custody approval from Office Admin.",
      requestId,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to initiate break-glass request.",
    };
  }
}

export async function approveBreakGlassAction(
  requestId: string,
  durationHours: number = 4
): Promise<BreakGlassActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.OFFICE_ADMIN) {
    return {
      success: false,
      message: "Unauthorized: Only an Office Administrator may approve an emergency break-glass request.",
    };
  }

  try {
    await approveBreakGlass({
      requestId,
      approvedByUserId: user.id,
      durationHours,
    });
    revalidatePath("/");
    return {
      success: true,
      message: `Emergency break-glass override APPROVED for ${durationHours} hours under dual-custody governance.`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to approve break-glass override.",
    };
  }
}

export async function revokeBreakGlassAction(
  requestId: string,
  reason: string
): Promise<BreakGlassActionResult> {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.OFFICE_ADMIN)) {
    return {
      success: false,
      message: "Unauthorized: Only an Administrator may revoke an emergency break-glass override.",
    };
  }

  try {
    await revokeBreakGlass({
      requestId,
      revokedByUserId: user.id,
      reason,
    });
    revalidatePath("/");
    return {
      success: true,
      message: "Emergency break-glass override successfully revoked.",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to revoke break-glass override.",
    };
  }
}
