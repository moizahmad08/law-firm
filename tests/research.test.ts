import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/database/client";
import { withUserContext } from "@/lib/database/context";
import {
  calculatePrecedentialAuthority,
  searchPrecedents,
} from "@/lib/research/service";
import {
  PrecedentCourtType,
  PrecedentPrecedentialWeight,
  PrecedentStatus,
  Role,
  PrismaClient,
} from "@prisma/client";

const ownerPrisma = new PrismaClient({
  datasources: { db: { url: process.env.SEED_DATABASE_URL || process.env.DATABASE_URL } },
});

describe("Milestone 6A: Pakistan Legal Precedent Engine & Hierarchy Rules (Articles 189 & 201)", () => {
  let superAdminId: string;
  let counselAlphaId: string;
  let testPrecedentId: string | undefined;

  beforeAll(async () => {
    const superAdmin = await prisma.user.findFirstOrThrow({
      where: { role: Role.SUPER_ADMIN },
    });
    const counselAlpha = await prisma.user.findFirstOrThrow({
      where: { email: "counsel.alpha@lawfirm.local" },
    });

    superAdminId = superAdmin.id;
    counselAlphaId = counselAlpha.id;
  });

  afterAll(async () => {
    if (testPrecedentId) {
      await ownerPrisma.legalPrecedent.deleteMany({
        where: { id: testPrecedentId },
      });
    }
    await ownerPrisma.$disconnect();
  });

  describe("Precedent Hierarchy Engine (Constitutional Articles 189 & 201)", () => {
    it("enforces Article 189: Supreme Court decisions are BINDING nationwide on all courts", () => {
      // Supreme Court before High Court Sindh
      const authSindh = calculatePrecedentialAuthority(
        PrecedentCourtType.SUPREME_COURT,
        3,
        PrecedentCourtType.HIGH_COURT_SINDH
      );
      expect(authSindh.effectiveAuthority).toBe("BINDING");
      expect(authSindh.reasoning).toContain("Article 189");

      // Supreme Court before High Court Lahore
      const authLahore = calculatePrecedentialAuthority(
        PrecedentCourtType.SUPREME_COURT,
        3,
        PrecedentCourtType.HIGH_COURT_LAHORE
      );
      expect(authLahore.effectiveAuthority).toBe("BINDING");
      expect(authLahore.reasoning).toContain("Article 189");

      // Supreme Court before Appellate Tribunal
      const authTribunal = calculatePrecedentialAuthority(
        PrecedentCourtType.SUPREME_COURT,
        3,
        PrecedentCourtType.APPELLATE_TRIBUNAL
      );
      expect(authTribunal.effectiveAuthority).toBe("BINDING");
    });

    it("evaluates Supreme Court intra-court bench size: larger bench reconsiders smaller bench", () => {
      // 5-judge Supreme Court bench considering a 3-judge Supreme Court precedent
      const authLargerBench = calculatePrecedentialAuthority(
        PrecedentCourtType.SUPREME_COURT,
        3,
        PrecedentCourtType.SUPREME_COURT,
        5
      );
      expect(authLargerBench.effectiveAuthority).toBe("PERSUASIVE");
      expect(authLargerBench.reasoning).toContain("Larger Supreme Court Bench (5-judge) may reconsider");

      // Same size or smaller bench is BOUND
      const authEqualBench = calculatePrecedentialAuthority(
        PrecedentCourtType.SUPREME_COURT,
        3,
        PrecedentCourtType.SUPREME_COURT,
        3
      );
      expect(authEqualBench.effectiveAuthority).toBe("BINDING");
    });

    it("enforces Article 201: High Court decisions are PERSUASIVE before High Courts of other provinces", () => {
      // Sindh High Court precedent cited in Lahore High Court
      const interHighCourt = calculatePrecedentialAuthority(
        PrecedentCourtType.HIGH_COURT_SINDH,
        2,
        PrecedentCourtType.HIGH_COURT_LAHORE
      );
      expect(interHighCourt.effectiveAuthority).toBe("PERSUASIVE");
      expect(interHighCourt.reasoning).toContain("persuasive value before other provincial High Courts");

      // Lahore High Court precedent cited in Sindh High Court
      const reverseInterHighCourt = calculatePrecedentialAuthority(
        PrecedentCourtType.HIGH_COURT_LAHORE,
        2,
        PrecedentCourtType.HIGH_COURT_SINDH
      );
      expect(reverseInterHighCourt.effectiveAuthority).toBe("PERSUASIVE");
    });

    it("enforces Article 201 intra-province binding authority with bench size rules", () => {
      // Sindh High Court precedent before Sindh High Court (same bench size)
      const intraHighCourt = calculatePrecedentialAuthority(
        PrecedentCourtType.HIGH_COURT_SINDH,
        2,
        PrecedentCourtType.HIGH_COURT_SINDH,
        2
      );
      expect(intraHighCourt.effectiveAuthority).toBe("BINDING");

      // Larger Full Bench (3-judge) in Sindh considering 2-judge Division Bench precedent
      const fullBenchConsideringDb = calculatePrecedentialAuthority(
        PrecedentCourtType.HIGH_COURT_SINDH,
        2,
        PrecedentCourtType.HIGH_COURT_SINDH,
        3
      );
      expect(fullBenchConsideringDb.effectiveAuthority).toBe("PERSUASIVE");
      expect(fullBenchConsideringDb.reasoning).toContain("larger bench (3-judge) is not bound");
    });
  });

  describe("Precedent Database Search & Research Gap Disclosure", () => {
    it("searches landmark precedents and resolves authority against target court", async () => {
      const searchRes = await searchPrecedents(counselAlphaId, {
        query: "Order 39",
        targetCourtType: PrecedentCourtType.HIGH_COURT_LAHORE,
      });

      expect(searchRes.results.length).toBeGreaterThan(0);
      const clcPrecedent = searchRes.results.find((r) => r.citation === "2023 CLC 880");
      expect(clcPrecedent).toBeDefined();
      expect(clcPrecedent?.court).toBe(PrecedentCourtType.HIGH_COURT_SINDH);
      // Because target court is Lahore, Sindh judgment is PERSUASIVE under Article 201
      expect(clcPrecedent?.effectiveAuthority).toBe("PERSUASIVE");
      expect(clcPrecedent?.authorityReasoning).toContain("persuasive value");
    });

    it("verifies Supreme Court tax precedent is BINDING nationwide", async () => {
      const searchRes = await searchPrecedents(counselAlphaId, {
        statutoryProvision: "Income Tax Ordinance 2001, s.122",
        targetCourtType: PrecedentCourtType.HIGH_COURT_SINDH,
      });

      expect(searchRes.results.length).toBeGreaterThan(0);
      const scmrPrecedent = searchRes.results.find((r) => r.citation === "2024 SCMR 150");
      expect(scmrPrecedent).toBeDefined();
      expect(scmrPrecedent?.court).toBe(PrecedentCourtType.SUPREME_COURT);
      expect(scmrPrecedent?.effectiveAuthority).toBe("BINDING");
      expect(scmrPrecedent?.authorityReasoning).toContain("Article 189");
    });

    it("discloses research gaps when no binding precedent exists for the targeted jurisdiction", async () => {
      // Search for a topic where only Sindh High Court precedent exists, but target court is Peshawar High Court
      const searchRes = await searchPrecedents(counselAlphaId, {
        topic: "Interim Injunction",
        targetCourtType: PrecedentCourtType.HIGH_COURT_PESHAWAR,
      });

      // We have 2023 CLC 880 (Sindh), so result count is > 0, but NONE are BINDING in Peshawar
      expect(searchRes.results.length).toBeGreaterThan(0);
      expect(searchRes.hasResearchGaps).toBe(true);
      expect(searchRes.gapNotice).toBeDefined();
      expect(searchRes.gapNotice).toContain("Jurisdictional Gap");
    });

    it("discloses research gaps when zero precedents match query", async () => {
      const searchRes = await searchPrecedents(counselAlphaId, {
        query: "NonExistentStatute12345XYZ",
      });

      expect(searchRes.results.length).toBe(0);
      expect(searchRes.hasResearchGaps).toBe(true);
      expect(searchRes.gapNotice).toContain("Research Gap: No direct verified precedent");
    });
  });
});
