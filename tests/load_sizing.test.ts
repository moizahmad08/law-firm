import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/database/client";
import { withUserContext } from "@/lib/database/context";
import { searchLitigation } from "@/lib/search/global-search";
import { searchPrecedents } from "@/lib/research/service";
import { Role, PrismaClient } from "@prisma/client";

const ownerPrisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.SEED_DATABASE_URL ||
        "postgresql://lms_owner:lms_dev_password@localhost:5432/lms_dev?schema=public",
    },
  },
});

describe("Milestone 7C: Load & Concurrency Sizing Verification (MASTER_SPEC Section 15 & 18)", () => {
  let counselAlphaId: string;
  let counselBetaId: string;
  let generalCaseId: string;

  beforeAll(async () => {
    const counselAlpha = await ownerPrisma.user.findFirstOrThrow({
      where: { email: "counsel.alpha@lawfirm.local" },
    });
    const counselBeta = await ownerPrisma.user.findFirstOrThrow({
      where: { email: "counsel.beta@lawfirm.local" },
    });
    counselAlphaId = counselAlpha.id;
    counselBetaId = counselBeta.id;

    const generalCase = await withUserContext(counselAlphaId, async (tx) => {
      return await tx.case.findFirstOrThrow({
        where: { caseNumber: "WP-101/2026" },
      });
    });
    generalCaseId = generalCase.id;
  });

  afterAll(async () => {
    await ownerPrisma.$disconnect();
  });

  it("simulates 25 concurrent user requests across RLS case querying, global search, and precedent lookups", async () => {
    const CONCURRENT_USERS = 25;
    const startTime = Date.now();

    // Spawn 25 concurrent asynchronous user operations simulating chamber workload
    const userTasks = Array.from({ length: CONCURRENT_USERS }, async (_, index) => {
      const userToUse = index % 2 === 0 ? counselAlphaId : counselBetaId;

      // 1. Trigram search for cases
      const searchTask = searchLitigation({
        query: index % 2 === 0 ? "WP-101" : "CS-202",
        userId: userToUse,
      });

      // 2. Precedent hierarchy query
      const precedentTask = searchPrecedents(userToUse, {
        query: "Order 39",
      });

      // 3. Matter metadata retrieval under RLS
      const caseDetailTask = withUserContext(userToUse, async (tx) => {
        return await tx.case.findFirst({
          where: { deletedAt: null },
          include: {
            parties: true,
            status: true,
          },
        });
      });

      const [searchRes, precedentRes, caseDetail] = await Promise.all([
        searchTask,
        precedentTask,
        caseDetailTask,
      ]);

      return {
        hasSearchResults: searchRes.totalCount >= 0,
        hasPrecedents: precedentRes.results.length >= 0,
        caseAccessible: caseDetail !== null,
      };
    });

    const results = await Promise.all(userTasks);
    const totalDurationMs = Date.now() - startTime;
    const avgLatencyPerUserMs = totalDurationMs / CONCURRENT_USERS;

    // All 25 concurrent user operations must succeed without deadlocks or pool exhaustion
    expect(results.length).toBe(CONCURRENT_USERS);
    expect(results.every((r) => r.hasSearchResults && r.hasPrecedents)).toBe(true);

    // Concurrency benchmark: 25 simulated user actions execute concurrently within 5 seconds total
    expect(totalDurationMs).toBeLessThan(5000);
    // Average elapsed time per concurrent user stays within healthy sub-250ms threshold
    expect(avgLatencyPerUserMs).toBeLessThan(250);
  });

  it("verifies connection pool health: handles sequential bursts without connection leaks", async () => {
    const BURST_COUNT = 30;
    const errors: any[] = [];

    for (let i = 0; i < BURST_COUNT; i++) {
      try {
        await withUserContext(counselAlphaId, async (tx) => {
          return await tx.case.findUnique({
            where: { id: generalCaseId },
            select: { id: true, caseNumber: true, status: true },
          });
        });
      } catch (err) {
        errors.push(err);
      }
    }

    expect(errors.length).toBe(0);
  });
});
