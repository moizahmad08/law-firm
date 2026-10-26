import { withUserContext } from "@/lib/database/context";
import { recordAuthAudit } from "@/lib/auth/audit";
import {
  PrecedentCourtType,
  PrecedentPrecedentialWeight,
  PrecedentStatus,
  Prisma,
} from "@prisma/client";

export interface PrecedentFilterOptions {
  query?: string;
  court?: PrecedentCourtType;
  jurisdictionProvince?: string;
  targetCourtType?: PrecedentCourtType;
  year?: number;
  topic?: string;
  statutoryProvision?: string;
  onlyGoodLaw?: boolean;
}

export interface PrecedentSearchResult {
  id: string;
  citation: string;
  title: string;
  court: PrecedentCourtType;
  bench: string;
  benchSize: number;
  decisionYear: number;
  decisionDate: Date | null;
  precedentialWeight: PrecedentPrecedentialWeight;
  status: PrecedentStatus;
  legalTopics: string[];
  statutoryProvisions: string[];
  headnote: string;
  summary: string;
  sourceUrl: string | null;
  effectiveAuthority: "BINDING" | "PERSUASIVE";
  authorityReasoning: string;
}

/**
 * Calculates effective precedential weight under Constitution of Pakistan Articles 189 & 201:
 * - Supreme Court decisions are BINDING on all courts across Pakistan (Art 189).
 * - High Court decisions are BINDING on all subordinate courts in that province (Art 201).
 * - High Court decisions are PERSUASIVE before High Courts of other provinces.
 * - Larger benches bind smaller benches of the same court.
 */
export function calculatePrecedentialAuthority(
  precedentCourt: PrecedentCourtType,
  precedentBenchSize: number,
  targetCourt?: PrecedentCourtType,
  targetBenchSize?: number
): { effectiveAuthority: "BINDING" | "PERSUASIVE"; reasoning: string } {
  // Rule 1: Supreme Court of Pakistan is binding on all courts (Article 189)
  if (precedentCourt === PrecedentCourtType.SUPREME_COURT) {
    if (targetCourt === PrecedentCourtType.SUPREME_COURT && targetBenchSize && targetBenchSize > precedentBenchSize) {
      return {
        effectiveAuthority: "PERSUASIVE",
        reasoning: `Larger Supreme Court Bench (${targetBenchSize}-judge) may reconsider smaller bench (${precedentBenchSize}-judge) precedent.`,
      };
    }
    return {
      effectiveAuthority: "BINDING",
      reasoning: "Article 189, Constitution of Pakistan: Supreme Court decisions bind all courts in Pakistan.",
    };
  }

  // Rule 2: Inter-High Court authority across provinces is persuasive (Article 201)
  if (
    targetCourt &&
    targetCourt !== PrecedentCourtType.SUPREME_COURT &&
    targetCourt !== precedentCourt
  ) {
    return {
      effectiveAuthority: "PERSUASIVE",
      reasoning: `Article 201: Judgments of ${precedentCourt} carry persuasive value before other provincial High Courts.`,
    };
  }

  // Rule 3: Intra-High Court bench size hierarchy
  if (targetCourt === precedentCourt && targetBenchSize && targetBenchSize > precedentBenchSize) {
    return {
      effectiveAuthority: "PERSUASIVE",
      reasoning: `A larger bench (${targetBenchSize}-judge) is not bound by a smaller bench (${precedentBenchSize}-judge) ruling.`,
    };
  }

  return {
    effectiveAuthority: "BINDING",
    reasoning: "Binding within provincial jurisdiction pursuant to Article 201.",
  };
}

/**
 * Searches legal precedents under PostgreSQL RLS with hierarchy classification and research gap disclosure.
 */
export async function searchPrecedents(
  userId: string,
  filters: PrecedentFilterOptions = {}
): Promise<{
  results: PrecedentSearchResult[];
  totalCount: number;
  hasResearchGaps: boolean;
  gapNotice?: string;
}> {
  return await withUserContext(userId, async (tx) => {
    const where: Prisma.LegalPrecedentWhereInput = {};

    if (filters.onlyGoodLaw) {
      where.status = PrecedentStatus.GOOD_LAW;
    }

    if (filters.court) {
      where.court = filters.court;
    }

    if (filters.year) {
      where.decisionYear = filters.year;
    }

    if (filters.topic) {
      where.legalTopics = { has: filters.topic };
    }

    if (filters.statutoryProvision) {
      where.statutoryProvisions = { has: filters.statutoryProvision };
    }

    if (filters.query && filters.query.trim()) {
      const q = filters.query.trim();
      where.OR = [
        { citation: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
        { headnote: { contains: q, mode: "insensitive" } },
        { summary: { contains: q, mode: "insensitive" } },
        { statutoryProvisions: { has: q } },
        { legalTopics: { has: q } },
      ];
    }

    const precedents = await tx.legalPrecedent.findMany({
      where,
      orderBy: [
        { decisionYear: "desc" },
        { benchSize: "desc" },
      ],
      take: 50,
    });

    const results: PrecedentSearchResult[] = precedents.map((p) => {
      const auth = calculatePrecedentialAuthority(p.court, p.benchSize, filters.targetCourtType);
      return {
        id: p.id,
        citation: p.citation,
        title: p.title,
        court: p.court,
        bench: p.bench,
        benchSize: p.benchSize,
        decisionYear: p.decisionYear,
        decisionDate: p.decisionDate,
        precedentialWeight: p.precedentialWeight,
        status: p.status,
        legalTopics: p.legalTopics,
        statutoryProvisions: p.statutoryProvisions,
        headnote: p.headnote,
        summary: p.summary,
        sourceUrl: p.sourceUrl,
        effectiveAuthority: auth.effectiveAuthority,
        authorityReasoning: auth.reasoning,
      };
    });

    const totalCount = await tx.legalPrecedent.count({ where });

    // Research gap disclosure: flag when zero exact matches or only persuasive precedents exist
    const hasResearchGaps: boolean =
      results.length === 0 ||
      Boolean(
        filters.targetCourtType &&
          !results.some((r) => r.effectiveAuthority === "BINDING" && r.status === PrecedentStatus.GOOD_LAW)
      );

    const gapNotice =
      results.length === 0
        ? "Research Gap: No direct verified precedent indexed for this proposition. Advocate verification required."
        : hasResearchGaps
        ? "Jurisdictional Gap: Only persuasive secondary precedents found. No direct binding Supreme Court or High Court bench precedent identified."
        : undefined;

    return {
      results,
      totalCount,
      hasResearchGaps,
      gapNotice,
    };
  });
}

/**
 * Creates or indexes a verified precedent into the firm's legal knowledge base.
 */
export async function createLegalPrecedent(
  userId: string,
  data: {
    citation: string;
    title: string;
    court: PrecedentCourtType;
    bench: string;
    benchSize?: number;
    decisionYear: number;
    decisionDate?: Date;
    precedentialWeight?: PrecedentPrecedentialWeight;
    status?: PrecedentStatus;
    legalTopics?: string[];
    statutoryProvisions?: string[];
    headnote: string;
    summary: string;
    sourceUrl?: string;
  }
) {
  return await withUserContext(userId, async (tx) => {
    const precedent = await tx.legalPrecedent.create({
      data: {
        citation: data.citation.trim(),
        title: data.title.trim(),
        court: data.court,
        bench: data.bench.trim(),
        benchSize: data.benchSize || 1,
        decisionYear: data.decisionYear,
        decisionDate: data.decisionDate,
        precedentialWeight:
          data.precedentialWeight ||
          (data.court === PrecedentCourtType.SUPREME_COURT
            ? PrecedentPrecedentialWeight.BINDING
            : PrecedentPrecedentialWeight.PERSUASIVE),
        status: data.status || PrecedentStatus.GOOD_LAW,
        legalTopics: data.legalTopics || [],
        statutoryProvisions: data.statutoryProvisions || [],
        headnote: data.headnote.trim(),
        summary: data.summary.trim(),
        sourceUrl: data.sourceUrl,
        verifiedById: userId,
      },
    });

    await recordAuthAudit({
      userId,
      action: "LEGAL_PRECEDENT_INDEXED",
      metadata: {
        precedentId: precedent.id,
        citation: precedent.citation,
        court: precedent.court,
      },
    });

    return precedent;
  });
}
