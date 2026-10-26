import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/database/client";
import { withUserContext } from "@/lib/database/context";

describe("Milestone 2A: Extended Schema, Parties, Custom Fields & Trigram Matching", () => {
  it("1. Master Data Availability: Courts and Benches are queryable by app role", async () => {
    const courts = await prisma.court.findMany();
    expect(courts.length).toBeGreaterThanOrEqual(5);

    const lhc = await prisma.court.findUnique({
      where: { code: "LHC" },
      include: { benches: true },
    });
    expect(lhc).not.toBeNull();
    expect(lhc?.benches.length).toBeGreaterThanOrEqual(4);
  });

  it("2. Party RLS Isolation: Counsel Alpha accesses parties for WP-101 but blocked from CS-202 parties", async () => {
    const alphaUser = await prisma.user.findUnique({
      where: { email: "counsel.alpha@lawfirm.local" },
    });
    expect(alphaUser).not.toBeNull();

    // Query parties under Counsel Alpha context
    const alphaParties = await withUserContext(alphaUser!.id, async (tx) => {
      return await tx.caseParty.findMany({
        select: { name: true, partyRole: true, isPrimary: true },
      });
    });

    // Alpha should see parties for WP-101/2026 only
    expect(alphaParties.length).toBeGreaterThanOrEqual(2);
    expect(alphaParties.some((p) => p.name.includes("Indus Commercial Consortium"))).toBe(true);
    expect(alphaParties.some((p) => p.name.includes("Federation of Pakistan"))).toBe(true);

    // Alpha must NOT see parties from restricted CS-202/2026
    expect(alphaParties.some((p) => p.name.includes("Apex Financial Conglomerate"))).toBe(false);
    expect(alphaParties.some((p) => p.name.includes("Global Telecom Holdings"))).toBe(false);
  });

  it("3. Restricted Case Party Isolation: Counsel Beta accesses parties for CS-202 only", async () => {
    const betaUser = await prisma.user.findUnique({
      where: { email: "counsel.beta@lawfirm.local" },
    });
    expect(betaUser).not.toBeNull();

    const betaParties = await withUserContext(betaUser!.id, async (tx) => {
      return await tx.caseParty.findMany({
        select: { name: true, partyRole: true },
      });
    });

    expect(betaParties.length).toBeGreaterThanOrEqual(2);
    expect(betaParties.some((p) => p.name.includes("Apex Financial Conglomerate"))).toBe(true);
    expect(betaParties.some((p) => p.name.includes("Global Telecom Holdings"))).toBe(true);

    // Beta must not see Counsel Alpha's parties
    expect(betaParties.some((p) => p.name.includes("Indus Commercial Consortium"))).toBe(false);
  });

  it("4. Custom Fields RLS Isolation: Counsel Alpha accesses custom fields for WP-101", async () => {
    const alphaUser = await prisma.user.findUnique({
      where: { email: "counsel.alpha@lawfirm.local" },
    });
    expect(alphaUser).not.toBeNull();

    const customValues = await withUserContext(alphaUser!.id, async (tx) => {
      return await tx.customFieldValue.findMany({
        include: { fieldDefinition: true },
      });
    });

    expect(customValues.length).toBeGreaterThanOrEqual(1);
    const taxValue = customValues.find((v) => v.fieldDefinition.code === "TAX_YEAR");
    expect(taxValue).toBeDefined();
    expect(taxValue?.valueNumber).toBe(2026);
  });

  it("5. Trigram Matching: pg_trgm evaluates similarity correctly", async () => {
    // Run direct raw query to verify pg_trgm similarity function
    const result = await prisma.$queryRaw<Array<{ sim: number }>>`
      SELECT similarity('Indus Commercial Consortium', 'Indus Commercial Corp') as sim;
    `;

    expect(result.length).toBe(1);
    expect(result[0]?.sim).toBeGreaterThan(0.4);
  });
});
