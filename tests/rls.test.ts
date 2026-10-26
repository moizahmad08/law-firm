import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/database/client";
import { withUserContext, assertCaseAccess } from "@/lib/database/context";

describe("Milestone 1C: PostgreSQL Row-Level Security (RLS) & Authorization Suite", () => {
  it("1. Zero Context Isolation: Query without user context returns 0 cases and 0 clients", async () => {
    // Naked queries outside withUserContext have no app.user_id set
    const cases = await prisma.case.findMany();
    const clients = await prisma.client.findMany();

    expect(cases.length).toBe(0);
    expect(clients.length).toBe(0);
  });

  it("2. Counsel Alpha Isolation: Can access only assigned case (WP-101/2026)", async () => {
    const alphaUser = await prisma.user.findUnique({
      where: { email: "counsel.alpha@lawfirm.local" },
    });
    expect(alphaUser).not.toBeNull();

    const accessibleCases = await withUserContext(alphaUser!.id, async (tx) => {
      return await tx.case.findMany({ select: { caseNumber: true, title: true } });
    });

    expect(accessibleCases.length).toBe(1);
    expect(accessibleCases[0]?.caseNumber).toBe("WP-101/2026");

    // Must not have access to Counsel Beta's case
    const betaCase = await prisma.case.findFirst({
      where: { caseNumber: "CS-202/2026" },
    });
    if (betaCase) {
      const hasAccessToBetaCase = await assertCaseAccess(alphaUser!.id, betaCase.id);
      expect(hasAccessToBetaCase).toBe(false);
    }
  });

  it("3. Counsel Beta Isolation: Can access only assigned case (CS-202/2026)", async () => {
    const betaUser = await prisma.user.findUnique({
      where: { email: "counsel.beta@lawfirm.local" },
    });
    expect(betaUser).not.toBeNull();

    const accessibleCases = await withUserContext(betaUser!.id, async (tx) => {
      return await tx.case.findMany({ select: { caseNumber: true, title: true } });
    });

    expect(accessibleCases.length).toBe(1);
    expect(accessibleCases[0]?.caseNumber).toBe("CS-202/2026");

    // Must not have access to Counsel Alpha's case
    const alphaCase = await prisma.case.findFirst({
      where: { caseNumber: "WP-101/2026" },
    });
    if (alphaCase) {
      const hasAccessToAlphaCase = await assertCaseAccess(betaUser!.id, alphaCase.id);
      expect(hasAccessToAlphaCase).toBe(false);
    }
  });

  it("4. Ethical Wall: Office Admin sees general cases, but CS-202/2026 is blocked (isRestricted = true)", async () => {
    const adminUser = await prisma.user.findUnique({
      where: { email: "senior.partner@lawfirm.local" },
    });
    expect(adminUser).not.toBeNull();

    const accessibleCases = await withUserContext(adminUser!.id, async (tx) => {
      return await tx.case.findMany({ select: { caseNumber: true, isRestricted: true } });
    });

    // Office admin sees non-restricted case(s)
    const caseNumbers = accessibleCases.map((c) => c.caseNumber);
    expect(caseNumbers).toContain("WP-101/2026");

    // Ethical wall: restricted case must NOT be returned because admin is not an assignee
    expect(caseNumbers).not.toContain("CS-202/2026");
  });

  it("5. Super Admin Default Isolation: Technical administrator has 0 case access by default", async () => {
    const superAdmin = await prisma.user.findUnique({
      where: { email: "admin.dev@lawfirm.local" },
    });
    expect(superAdmin).not.toBeNull();

    const accessibleCases = await withUserContext(superAdmin!.id, async (tx) => {
      return await tx.case.findMany();
    });

    // Super Admin has NO default access to legal matter content
    expect(accessibleCases.length).toBe(0);
  });

  it("6. Forced RLS: relforcerowsecurity is strictly enabled on all protected tables", async () => {
    const rows = (await prisma.$queryRawUnsafe(`
      SELECT relname, relrowsecurity, relforcerowsecurity
      FROM pg_class
      WHERE relname IN ('cases', 'clients', 'case_assignments', 'sessions', 'audit_events')
      ORDER BY relname ASC;
    `)) as Array<{
      relname: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>;

    expect(rows.length).toBe(5);
    for (const r of rows) {
      expect(r.relrowsecurity).toBe(true);
      expect(r.relforcerowsecurity).toBe(true);
    }
  });

  it("7. Audit Table Immutability: UPDATE and DELETE are rejected for lms_app at DB level", async () => {
    // Attempting DELETE must throw a database permission denied error
    await expect(
      prisma.$executeRawUnsafe("DELETE FROM audit_events;")
    ).rejects.toThrow(/permission denied/i);

    // Attempting UPDATE must throw a database permission denied error
    await expect(
      prisma.$executeRawUnsafe("UPDATE audit_events SET action = 'tampered';")
    ).rejects.toThrow(/permission denied/i);
  });
});
