import { describe, it, expect } from "vitest";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/database/client";
import { createSession, validateSessionToken } from "@/lib/auth/session";
import { withUserContext } from "@/lib/database/context";

describe("Milestone 1D: Application Shell & Dashboard Authorization Suite", () => {
  it("1. Zero Authentication: Null or empty token returns null session and blocks access", async () => {
    const invalidResult = await validateSessionToken("");
    expect(invalidResult).toBeNull();

    const randomTokenResult = await validateSessionToken("nonexistent-token-value-12345");
    expect(randomTokenResult).toBeNull();
  });

  it("2. Counsel Alpha Dashboard Scope: Receives assigned case WP-101 and cannot see restricted CS-202", async () => {
    const alphaUser = await prisma.user.findUnique({
      where: { email: "counsel.alpha@lawfirm.local" },
    });
    expect(alphaUser).not.toBeNull();
    expect(alphaUser?.role).toBe(Role.LAWYER);

    // Create session for Counsel Alpha
    const { rawToken } = await createSession({
      userId: alphaUser!.id,
      ipAddress: "127.0.0.1",
      userAgent: "vitest-shell-runner",
    });

    const sessionResult = await validateSessionToken(rawToken);
    expect(sessionResult).not.toBeNull();
    expect(sessionResult?.user.role).toBe(Role.LAWYER);

    // Query cases under Counsel Alpha context
    const cases = await withUserContext(alphaUser!.id, async (tx) => {
      return await tx.case.findMany({
        select: { caseNumber: true, isRestricted: true },
      });
    });

    expect(cases.length).toBe(1);
    expect(cases[0]?.caseNumber).toBe("WP-101/2026");
    expect(cases[0]?.isRestricted).toBe(false);
  });

  it("3. Counsel Beta Dashboard Scope: Receives assigned restricted case CS-202 with isRestricted = true", async () => {
    const betaUser = await prisma.user.findUnique({
      where: { email: "counsel.beta@lawfirm.local" },
    });
    expect(betaUser).not.toBeNull();
    expect(betaUser?.role).toBe(Role.LAWYER);

    const cases = await withUserContext(betaUser!.id, async (tx) => {
      return await tx.case.findMany({
        select: { caseNumber: true, isRestricted: true },
      });
    });

    expect(cases.length).toBe(1);
    expect(cases[0]?.caseNumber).toBe("CS-202/2026");
    expect(cases[0]?.isRestricted).toBe(true);
  });

  it("4. Office Admin Dashboard Scope: Sees standard cases, but restricted CS-202 is blocked", async () => {
    const adminUser = await prisma.user.findUnique({
      where: { email: "senior.partner@lawfirm.local" },
    });
    expect(adminUser).not.toBeNull();
    expect(adminUser?.role).toBe(Role.OFFICE_ADMIN);

    const cases = await withUserContext(adminUser!.id, async (tx) => {
      return await tx.case.findMany({
        select: { caseNumber: true, isRestricted: true },
      });
    });

    // Office admin sees only the non-restricted case WP-101/2026
    expect(cases.length).toBe(1);
    expect(cases[0]?.caseNumber).toBe("WP-101/2026");
    expect(cases.some((c) => c.caseNumber === "CS-202/2026")).toBe(false);
  });

  it("5. Super Admin Dashboard Scope: Zero cases accessible by default (separation of concerns)", async () => {
    const superAdmin = await prisma.user.findUnique({
      where: { email: "admin.dev@lawfirm.local" },
    });
    expect(superAdmin).not.toBeNull();
    expect(superAdmin?.role).toBe(Role.SUPER_ADMIN);

    const cases = await withUserContext(superAdmin!.id, async (tx) => {
      return await tx.case.findMany();
    });

    // Super Admin has zero case visibility under RLS
    expect(cases.length).toBe(0);

    // But Super Admin has visibility into audit events
    const auditCount = await prisma.auditEvent.count();
    expect(auditCount).toBeGreaterThan(0);
  });
});
