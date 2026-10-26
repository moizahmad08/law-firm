import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/database/client";
import { withUserContext } from "@/lib/database/context";

describe("Milestone 1A: Core Data Model & Roles Verification", () => {
  it("verifies all 6 seeded fictional staff users exist across all 5 roles", async () => {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: { email: true, role: true, fullName: true, rowVersion: true },
    });

    expect(users.length).toBeGreaterThanOrEqual(6);
    const roles = users.map((u) => u.role);
    expect(roles).toContain("SUPER_ADMIN");
    expect(roles).toContain("OFFICE_ADMIN");
    expect(roles).toContain("LAWYER");
    expect(roles).toContain("ASSISTANT");
    expect(roles).toContain("FINANCE_ADMIN");
  });

  it("verifies all 8 configurable case statuses exist as rows (not hard-coded enums)", async () => {
    const statuses = await prisma.caseStatus.findMany({
      orderBy: { displayOrder: "asc" },
    });

    expect(statuses.length).toBe(8);
    const codes = statuses.map((s) => s.code);
    expect(codes).toEqual([
      "DRAFT",
      "ACTIVE",
      "AWAITING_HEARING",
      "AWAITING_CLIENT",
      "JUDGMENT_RESERVED",
      "DECIDED",
      "APPEALED",
      "CLOSED",
    ]);
  });

  it("verifies cases exist with ethical-wall flag (isRestricted)", async () => {
    const alphaUser = await prisma.user.findUnique({
      where: { email: "counsel.alpha@lawfirm.local" },
    });
    const betaUser = await prisma.user.findUnique({
      where: { email: "counsel.beta@lawfirm.local" },
    });
    expect(alphaUser).not.toBeNull();
    expect(betaUser).not.toBeNull();

    const standardCase = await withUserContext(alphaUser!.id, async (tx) => {
      return await tx.case.findFirst({
        where: { isRestricted: false },
        include: { client: true, status: true, assignments: true },
      });
    });
    expect(standardCase).not.toBeNull();
    expect(standardCase?.assignments.length).toBeGreaterThanOrEqual(1);

    const restrictedCase = await withUserContext(betaUser!.id, async (tx) => {
      return await tx.case.findFirst({
        where: { isRestricted: true },
      });
    });
    expect(restrictedCase).not.toBeNull();
    expect(restrictedCase?.isRestricted).toBe(true);
  });

  it("verifies withUserContext executes transaction with app.user_id set", async () => {
    const testUserId = "00000000-0000-0000-0000-000000000001";
    const result = await withUserContext(testUserId, async (tx) => {
      const rows = (await tx.$queryRawUnsafe(
        "SELECT current_setting('app.user_id', true) as user_id;"
      )) as Array<{ user_id: string }>;
      return rows[0]?.user_id;
    });

    expect(result).toBe(testUserId);
  });

  it("verifies table invariants: row_version and timestamps are set", async () => {
    const alphaUser = await prisma.user.findUnique({
      where: { email: "counsel.alpha@lawfirm.local" },
    });
    const aCase = await withUserContext(alphaUser!.id, async (tx) => {
      return await tx.case.findFirst();
    });
    expect(aCase).not.toBeNull();
    expect(aCase?.rowVersion).toBeGreaterThanOrEqual(1);
    expect(aCase?.createdAt).toBeInstanceOf(Date);
    expect(aCase?.updatedAt).toBeInstanceOf(Date);
    expect(aCase?.deletedAt).toBeNull();
  });
});
