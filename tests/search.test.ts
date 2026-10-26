import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/database/client";
import { withUserContext } from "@/lib/database/context";
import { searchLitigation } from "@/lib/search/global-search";
import {
  requestBreakGlass,
  approveBreakGlass,
  revokeBreakGlass,
} from "@/lib/admin/break-glass";
import { Role, BreakGlassStatus } from "@prisma/client";

describe("Milestone 2D: Permission-Safe Global Search & Break-Glass Protocol", () => {
  let superAdminId: string;
  let officeAdminId: string;
  let counselAlphaId: string;
  let counselBetaId: string;
  let restrictedCaseId: string;
  let generalCaseId: string;

  beforeAll(async () => {
    // Fetch users seeded in the database
    const superAdmin = await prisma.user.findFirstOrThrow({
      where: { role: Role.SUPER_ADMIN },
    });
    const officeAdmin = await prisma.user.findFirstOrThrow({
      where: { role: Role.OFFICE_ADMIN },
    });
    const counselAlpha = await prisma.user.findFirstOrThrow({
      where: { email: "counsel.alpha@lawfirm.local" },
    });
    const counselBeta = await prisma.user.findFirstOrThrow({
      where: { email: "counsel.beta@lawfirm.local" },
    });

    superAdminId = superAdmin.id;
    officeAdminId = officeAdmin.id;
    counselAlphaId = counselAlpha.id;
    counselBetaId = counselBeta.id;

    // Fetch test cases under respective authorized user contexts (due to RLS)
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

  describe("1. Permission-Safe Trigram Search", () => {
    it("finds general case by case number and title for authorized counsel", async () => {
      const searchRes = await searchLitigation({
        query: "WP-101",
        userId: counselAlphaId,
      });

      expect(searchRes.totalCount).toBeGreaterThanOrEqual(1);
      const match = searchRes.results.find((r) => r.type === "CASE");
      expect(match).toBeDefined();
      expect(match?.title).toContain("WP-101/2026");
    });

    it("STRICT ISOLATION: unassigned counsel Alpha searching restricted matter returns 0 results", async () => {
      // Counsel Alpha is NOT assigned to CS-202/2026
      // Searching for "Global Telecom" (party in CS-202) must return 0 results
      const searchAlpha = await searchLitigation({
        query: "Global Telecom",
        userId: counselAlphaId,
      });

      expect(searchAlpha.totalCount).toBe(0);
      expect(searchAlpha.results).toHaveLength(0);
    });

    it("ETHICAL WALL: Office Admin searching restricted matter returns 0 results", async () => {
      // Office Admin is blocked by ethical wall on restricted cases unless explicitly assigned
      const searchAdmin = await searchLitigation({
        query: "Global Telecom",
        userId: officeAdminId,
      });

      expect(searchAdmin.totalCount).toBe(0);
      expect(searchAdmin.results).toHaveLength(0);
    });

    it("AUTHORIZED COUNSEL: assigned counsel Beta searching restricted matter finds CS-202", async () => {
      // Counsel Beta IS assigned to CS-202/2026
      const searchBeta = await searchLitigation({
        query: "Global Telecom",
        userId: counselBetaId,
      });

      expect(searchBeta.totalCount).toBeGreaterThanOrEqual(1);
      const partyMatch = searchBeta.results.find(
        (r) => r.type === "PARTY" && r.title.includes("Global Telecom")
      );
      expect(partyMatch).toBeDefined();
      expect(partyMatch?.caseId).toBe(restrictedCaseId);
    });
  });

  describe("2. Super Admin Break-Glass Emergency Protocol", () => {
    let activeRequestId: string;

    it("Super Admin by default has 0 access to restricted cases under RLS", async () => {
      const cases = await withUserContext(superAdminId, async (tx) => {
        return tx.case.findMany({
          where: { id: restrictedCaseId },
        });
      });
      expect(cases).toHaveLength(0);
    });

    it("Super Admin requests emergency break-glass override", async () => {
      activeRequestId = await requestBreakGlass({
        targetCaseId: restrictedCaseId,
        requestedByUserId: superAdminId,
        justification: "Urgent judicial compliance audit requested by Lahore High Court inspection team.",
      });

      expect(activeRequestId).toBeDefined();

      const req = await withUserContext(superAdminId, async (tx) => {
        return tx.breakGlassRequest.findUnique({
          where: { id: activeRequestId },
        });
      });
      expect(req?.status).toBe(BreakGlassStatus.PENDING);
    });

    it("DUAL-CUSTODY VIOLATION: Super Admin cannot approve their own break-glass request", async () => {
      await expect(
        approveBreakGlass({
          requestId: activeRequestId,
          approvedByUserId: superAdminId, // Self-approval attempt
        })
      ).rejects.toThrow(/Dual-custody violation/i);
    });

    it("DUAL-CUSTODY APPROVAL: Office Admin approves the break-glass override", async () => {
      const approved = await approveBreakGlass({
        requestId: activeRequestId,
        approvedByUserId: officeAdminId,
        durationHours: 4,
      });

      expect(approved).toBe(true);

      const req = await withUserContext(superAdminId, async (tx) => {
        return tx.breakGlassRequest.findUnique({
          where: { id: activeRequestId },
        });
      });
      expect(req?.status).toBe(BreakGlassStatus.APPROVED);
      expect(req?.approvedByUserId).toBe(officeAdminId);
      expect(req?.expiresAt).toBeDefined();
    });

    it("RLS ENFORCEMENT: Super Admin with approved override can now access the case under RLS", async () => {
      const cases = await withUserContext(superAdminId, async (tx) => {
        return tx.case.findMany({
          where: { id: restrictedCaseId },
        });
      });

      expect(cases).toHaveLength(1);
      expect(cases[0].id).toBe(restrictedCaseId);
      expect(cases[0].caseNumber).toBe("CS-202/2026");
    });

    it("SEARCH ENFORCEMENT: Super Admin with approved override can search the case", async () => {
      const searchRes = await searchLitigation({
        query: "Global Telecom",
        userId: superAdminId,
      });

      expect(searchRes.totalCount).toBeGreaterThanOrEqual(1);
    });

    it("REVOCATION: Revoking break-glass terminates emergency access immediately", async () => {
      await revokeBreakGlass({
        requestId: activeRequestId,
        revokedByUserId: officeAdminId,
        reason: "Compliance audit successfully completed.",
      });

      // Verify status is REVOKED
      const req = await withUserContext(superAdminId, async (tx) => {
        return tx.breakGlassRequest.findUnique({
          where: { id: activeRequestId },
        });
      });
      expect(req?.status).toBe(BreakGlassStatus.REVOKED);

      // Verify Super Admin once again has 0 access under RLS
      const cases = await withUserContext(superAdminId, async (tx) => {
        return tx.case.findMany({
          where: { id: restrictedCaseId },
        });
      });

      expect(cases).toHaveLength(0);
    });
  });
});
