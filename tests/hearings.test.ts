import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/database/client";
import { withUserContext } from "@/lib/database/context";
import {
  scheduleHearing,
  recordHearingOutcome,
  getUpcomingHearings,
} from "@/lib/hearings/service";
import { HearingStatus, Role } from "@prisma/client";

describe("Milestone 3C: Hearings & Court Calendar Management Suite", () => {
  let officeAdminId: string;
  let counselAlphaId: string;
  let counselBetaId: string;
  let generalCaseId: string;
  let restrictedCaseId: string;

  beforeAll(async () => {
    const officeAdmin = await prisma.user.findFirstOrThrow({
      where: { role: Role.OFFICE_ADMIN },
    });
    const counselAlpha = await prisma.user.findFirstOrThrow({
      where: { email: "counsel.alpha@lawfirm.local" },
    });
    const counselBeta = await prisma.user.findFirstOrThrow({
      where: { email: "counsel.beta@lawfirm.local" },
    });

    officeAdminId = officeAdmin.id;
    counselAlphaId = counselAlpha.id;
    counselBetaId = counselBeta.id;

    const generalCase = await withUserContext(counselAlphaId, async (tx) => {
      return await tx.case.findFirstOrThrow({
        where: { caseNumber: "WP-101/2026" },
      });
    });

    const restrictedCase = await withUserContext(counselBetaId, async (tx) => {
      return await tx.case.findFirstOrThrow({
        where: { caseNumber: "CS-202/2026", isRestricted: true },
      });
    });

    generalCaseId = generalCase.id;
    restrictedCaseId = restrictedCase.id;
  });

  describe("1. Court Hearing Scheduling & RLS Isolation", () => {
    let alphaHearingId: string;
    let betaHearingId: string;

    it("Schedules court hearing in Lahore High Court for WP-101", async () => {
      const hearingDate = new Date("2026-11-15T09:30:00+05:00"); // Asia/Karachi time

      const hearing = await scheduleHearing({
        caseId: generalCaseId,
        court: "Lahore High Court",
        hearingDate,
        purpose: "Arguments on Interim Injunctive Relief / Stay Application",
        notes: "Bench No. 2 before Mr. Justice Mansoor Ali Shah",
        createdById: counselAlphaId,
      });

      expect(hearing.id).toBeDefined();
      expect(hearing.status).toBe(HearingStatus.SCHEDULED);
      alphaHearingId = hearing.id;
    });

    it("Schedules hearing in restricted case CS-202/2026", async () => {
      const hearingDate = new Date("2026-11-20T11:00:00+05:00");

      const hearing = await scheduleHearing({
        caseId: restrictedCaseId,
        court: "Lahore High Court",
        hearingDate,
        purpose: "Framing of Issues in Corporate Governance Dispute",
        createdById: counselBetaId,
      });

      expect(hearing.id).toBeDefined();
      betaHearingId = hearing.id;
    });

    it("ETHICAL WALL RLS: Counsel Alpha cannot view hearings from restricted case CS-202", async () => {
      const hearings = await withUserContext(counselAlphaId, async (tx) => {
        return await tx.hearing.findMany({
          where: { id: betaHearingId },
        });
      });

      expect(hearings).toHaveLength(0);
    });

    it("ETHICAL WALL RLS: Office Admin cannot view hearings from restricted case CS-202", async () => {
      const hearings = await withUserContext(officeAdminId, async (tx) => {
        return await tx.hearing.findMany({
          where: { id: betaHearingId },
        });
      });

      expect(hearings).toHaveLength(0);
    });

    it("Retrieves upcoming hearings list under Counsel Alpha's context", async () => {
      const list = await getUpcomingHearings({
        userId: counselAlphaId,
        limit: 50,
      });

      expect(list.length).toBeGreaterThanOrEqual(1);
      const match = list.find((h) => h.id === alphaHearingId);
      expect(match).toBeDefined();
      expect(match?.case.caseNumber).toBe("WP-101/2026");
    });
  });

  describe("2. Hearing Outcome & Post-Hearing Actions", () => {
    it("Records adjourned outcome, next date, and action required", async () => {
      // Find the hearing scheduled for generalCaseId
      const hearing = await withUserContext(counselAlphaId, async (tx) => {
        return await tx.hearing.findFirstOrThrow({
          where: { caseId: generalCaseId },
        });
      });

      const nextHearingDate = new Date("2026-12-05T09:30:00+05:00");

      const updated = await recordHearingOutcome({
        hearingId: hearing.id,
        status: HearingStatus.ADJOURNED,
        outcome: "Arguments partly heard. Interim stay granted till next date. Respondent directed to file reply.",
        nextDate: nextHearingDate,
        actionRequired: "File rejoinder to Respondent's written statement before next hearing date.",
        notes: "Court directed both sides to conclude arguments on next date.",
        userId: counselAlphaId,
      });

      expect(updated.status).toBe(HearingStatus.ADJOURNED);
      expect(updated.outcome).toContain("Interim stay granted");
      expect(updated.actionRequired).toContain("File rejoinder");
      expect(updated.nextDate).toBeDefined();

      // Verify audit record
      const audit = await prisma.auditEvent.findFirst({
        where: {
          action: "HEARING_OUTCOME_RECORDED",
          userId: counselAlphaId,
        },
        orderBy: { createdAt: "desc" },
      });
      expect(audit).not.toBeNull();
    });
  });
});
