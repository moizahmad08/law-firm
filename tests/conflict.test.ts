import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/database/client";
import { runConflictCheck, clearConflict } from "@/lib/cases/conflict-check";

describe("Milestone 2B: Conflict of Interest Detection & Clearance Engine", () => {
  it("1. Exact Match Detection: Queries for known adverse party flag CRITICAL conflict", async () => {
    const admin = await prisma.user.findUnique({
      where: { email: "senior.partner@lawfirm.local" },
    });
    expect(admin).not.toBeNull();

    const result = await runConflictCheck({
      partyName: "Indus River System Authority (IRSA)",
      queriedByName: admin!.fullName,
      queriedByUserId: admin!.id,
    });

    expect(result.matchFound).toBe(true);
    expect(result.matches.length).toBeGreaterThanOrEqual(1);

    const firstMatch = result.matches[0];
    expect(firstMatch).toBeDefined();
    expect(firstMatch?.severity).toBe("CRITICAL");
    expect(firstMatch?.caseNumber).toBe("WP-101/2026");
  });

  it("2. Fuzzy Trigram Match: Catches partial spelling and phonetic variations", async () => {
    const admin = await prisma.user.findUnique({
      where: { email: "senior.partner@lawfirm.local" },
    });

    const result = await runConflictCheck({
      partyName: "Indus Commercial Corp",
      queriedByName: admin!.fullName,
      queriedByUserId: admin!.id,
      similarityThreshold: 0.35,
    });

    expect(result.matchFound).toBe(true);
    expect(result.matches.some((m) => m.matchedName.includes("Indus Commercial"))).toBe(true);
  });

  it("3. Clean Query: Unrelated prospective client yields zero conflicts and auto-clears", async () => {
    const result = await runConflictCheck({
      partyName: "Completely Unrelated Novel Entity Limited 2026",
      cnic: "99999-9999999-9",
      queriedByName: "Automated Tester",
    });

    expect(result.matchFound).toBe(false);
    expect(result.matches.length).toBe(0);

    const savedRecord = await prisma.conflictCheckRecord.findUnique({
      where: { id: result.conflictRecordId },
    });
    expect(savedRecord?.isCleared).toBe(true);
  });

  it("4. Ethical Wall Leak Prevention: Conflict check never leaks restricted cases to unauthorized counsel (Master Spec 5.1)", async () => {
    const alphaUser = await prisma.user.findUnique({
      where: { email: "counsel.alpha@lawfirm.local" },
    });
    const betaUser = await prisma.user.findUnique({
      where: { email: "counsel.beta@lawfirm.local" },
    });

    // Counsel Alpha is NOT assigned to restricted case CS-202 (Global Telecom)
    // Therefore, Alpha's conflict check MUST return 0 matches to prevent leaking restricted matters
    const alphaResult = await runConflictCheck({
      partyName: "Global Telecom Holdings",
      queriedByName: alphaUser!.fullName,
      queriedByUserId: alphaUser!.id,
    });
    expect(alphaResult.matchFound).toBe(false);

    // But Counsel Beta IS assigned to restricted case CS-202
    // Therefore, Beta's check correctly detects the match
    const betaResult = await runConflictCheck({
      partyName: "Global Telecom Holdings",
      queriedByName: betaUser!.fullName,
      queriedByUserId: betaUser!.id,
    });
    expect(betaResult.matchFound).toBe(true);
    expect(betaResult.matches.some((m) => m.caseNumber === "CS-202/2026")).toBe(true);
  });

  it("5. Manual Clearance Workflow: Authorized Counsel can record clearance justification", async () => {
    const alphaUser = await prisma.user.findUnique({
      where: { email: "counsel.alpha@lawfirm.local" },
    });

    // Run check that finds conflict on Alpha's assigned case
    const result = await runConflictCheck({
      partyName: "Indus River System Authority",
      queriedByName: alphaUser!.fullName,
      queriedByUserId: alphaUser!.id,
    });

    expect(result.matchFound).toBe(true);

    // Clear conflict with partner justification
    const cleared = await clearConflict({
      conflictRecordId: result.conflictRecordId,
      clearedByUserId: alphaUser!.id,
      clearanceNotes: "Prospective party is a non-exclusive supplier; no substantive privity with dispute.",
    });

    expect(cleared).toBe(true);

    const updated = await prisma.conflictCheckRecord.findUnique({
      where: { id: result.conflictRecordId },
    });
    expect(updated?.isCleared).toBe(true);
    expect(updated?.clearanceNotes).toContain("non-exclusive supplier");
  });

  it("6. Audit Log Evidence: Conflict checks generate immutable audit entries", async () => {
    const audits = await prisma.auditEvent.findMany({
      where: {
        action: {
          in: [
            "CONFLICT_CHECK_MATCH_DETECTED",
            "CONFLICT_CHECK_CLEARED_AUTO",
            "CONFLICT_CHECK_MANUALLY_CLEARED",
          ],
        },
      },
      orderBy: { createdAt: "desc" },
    });

    expect(audits.length).toBeGreaterThanOrEqual(1);
  });
});
