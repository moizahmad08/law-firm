"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { scheduleHearing, recordHearingOutcome } from "@/lib/hearings/service";
import { HearingStatus } from "@prisma/client";

export async function scheduleHearingAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const caseId = formData.get("caseId") as string;
  const court = formData.get("court") as string;
  const benchId = (formData.get("benchId") as string) || null;
  const judgeId = (formData.get("judgeId") as string) || null;
  const hearingDate = formData.get("hearingDate") as string;
  const purpose = formData.get("purpose") as string;
  const notes = (formData.get("notes") as string) || "";

  if (!caseId || !court || !hearingDate || !purpose) {
    return { success: false, error: "Missing required fields (case, court, hearing date, purpose)." };
  }

  try {
    await scheduleHearing({
      caseId,
      court,
      benchId,
      judgeId,
      hearingDate,
      purpose,
      notes,
      createdById: user.id,
    });

    revalidatePath(`/cases/${caseId}`);
    return { success: true, message: "Court hearing scheduled successfully." };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to schedule hearing." };
  }
}

export async function recordHearingOutcomeAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const hearingId = formData.get("hearingId") as string;
  const caseId = formData.get("caseId") as string;
  const status = formData.get("status") as HearingStatus;
  const outcome = formData.get("outcome") as string;
  const nextDate = (formData.get("nextDate") as string) || null;
  const actionRequired = (formData.get("actionRequired") as string) || null;
  const notes = (formData.get("notes") as string) || "";

  if (!hearingId || !status || !outcome) {
    return { success: false, error: "Missing required fields (hearing ID, status, outcome)." };
  }

  try {
    await recordHearingOutcome({
      hearingId,
      status,
      outcome,
      nextDate,
      actionRequired,
      notes,
      userId: user.id,
    });

    if (caseId) {
      revalidatePath(`/cases/${caseId}`);
    }
    return { success: true, message: "Hearing outcome recorded successfully." };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to record hearing outcome." };
  }
}
