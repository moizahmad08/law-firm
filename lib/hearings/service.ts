import { withUserContext } from "@/lib/database/context";
import { recordAuthAudit } from "@/lib/auth/audit";
import { HearingStatus } from "@prisma/client";

export interface ScheduleHearingInput {
  caseId: string;
  court: string;
  benchId?: string | null;
  judgeId?: string | null;
  hearingDate: Date | string;
  purpose: string;
  notes?: string;
  createdById: string;
}

export interface RecordHearingOutcomeInput {
  hearingId: string;
  status: HearingStatus;
  outcome: string;
  nextDate?: Date | string | null;
  actionRequired?: string | null;
  notes?: string;
  userId: string;
}

/**
 * Schedules a new court hearing for a case.
 */
export async function scheduleHearing(input: ScheduleHearingInput) {
  const hearingDate = new Date(input.hearingDate);
  if (isNaN(hearingDate.getTime())) {
    throw new Error("Invalid hearing date provided.");
  }

  return await withUserContext(input.createdById, async (tx) => {
    const hearing = await tx.hearing.create({
      data: {
        caseId: input.caseId,
        court: input.court,
        benchId: input.benchId || null,
        judgeId: input.judgeId || null,
        hearingDate,
        purpose: input.purpose.trim(),
        notes: input.notes?.trim(),
        createdById: input.createdById,
        status: HearingStatus.SCHEDULED,
      },
    });

    await recordAuthAudit({
      userId: input.createdById,
      action: "HEARING_SCHEDULED",
      metadata: {
        hearingId: hearing.id,
        caseId: input.caseId,
        hearingDate,
        court: input.court,
        purpose: input.purpose,
      },
    });

    return hearing;
  });
}

/**
 * Records outcome of a concluded or adjourned court hearing.
 */
export async function recordHearingOutcome(input: RecordHearingOutcomeInput) {
  const nextDate = input.nextDate ? new Date(input.nextDate) : null;

  return await withUserContext(input.userId, async (tx) => {
    const existing = await tx.hearing.findUnique({
      where: { id: input.hearingId },
    });

    if (!existing) {
      throw new Error("Hearing record not found or access denied.");
    }

    const updated = await tx.hearing.update({
      where: { id: input.hearingId },
      data: {
        status: input.status,
        outcome: input.outcome.trim(),
        nextDate,
        actionRequired: input.actionRequired?.trim(),
        notes: input.notes ? `${existing.notes || ""}\n${input.notes}`.trim() : existing.notes,
        updatedAt: new Date(),
      },
    });

    await recordAuthAudit({
      userId: input.userId,
      action: "HEARING_OUTCOME_RECORDED",
      metadata: {
        hearingId: updated.id,
        caseId: updated.caseId,
        status: input.status,
        outcome: input.outcome,
        nextDate,
      },
    });

    return updated;
  });
}

/**
 * Retrieves upcoming hearings accessible to the current user under RLS.
 */
export async function getUpcomingHearings({
  userId,
  limit = 10,
}: {
  userId: string;
  limit?: number;
}) {
  return await withUserContext(userId, async (tx) => {
    return await tx.hearing.findMany({
      where: {
        deletedAt: null,
        status: { in: [HearingStatus.SCHEDULED, HearingStatus.ADJOURNED] },
      },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            court: true,
            isRestricted: true,
          },
        },
        benchRef: {
          select: { name: true, code: true },
        },
        judgeRef: {
          select: { fullName: true, designation: true },
        },
      },
      orderBy: { hearingDate: "asc" },
      take: limit,
    });
  });
}
