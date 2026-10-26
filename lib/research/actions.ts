"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { searchPrecedents, createLegalPrecedent } from "./service";
import { PrecedentCourtType, PrecedentStatus } from "@prisma/client";

export async function searchPrecedentsAction(params: {
  query?: string;
  court?: PrecedentCourtType;
  targetCourtType?: PrecedentCourtType;
  year?: number;
  topic?: string;
  statutoryProvision?: string;
  onlyGoodLaw?: boolean;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const result = await searchPrecedents(user.id, params);
    return {
      success: true,
      results: result.results,
      totalCount: result.totalCount,
      hasResearchGaps: result.hasResearchGaps,
      gapNotice: result.gapNotice,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to search precedents." };
  }
}

export async function createPrecedentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const citation = formData.get("citation") as string;
  const title = formData.get("title") as string;
  const court = formData.get("court") as PrecedentCourtType;
  const bench = formData.get("bench") as string;
  const benchSize = parseInt(formData.get("benchSize") as string, 10) || 1;
  const decisionYear = parseInt(formData.get("decisionYear") as string, 10);
  const headnote = formData.get("headnote") as string;
  const summary = formData.get("summary") as string;
  const topicsRaw = (formData.get("legalTopics") as string) || "";
  const statutesRaw = (formData.get("statutoryProvisions") as string) || "";

  if (!citation || !title || !court || !bench || !decisionYear || !headnote || !summary) {
    return { success: false, error: "All required citation fields must be provided." };
  }

  const legalTopics = topicsRaw.split(",").map((s) => s.trim()).filter(Boolean);
  const statutoryProvisions = statutesRaw.split(",").map((s) => s.trim()).filter(Boolean);

  try {
    const precedent = await createLegalPrecedent(user.id, {
      citation,
      title,
      court,
      bench,
      benchSize,
      decisionYear,
      headnote,
      summary,
      legalTopics,
      statutoryProvisions,
      status: PrecedentStatus.GOOD_LAW,
    });

    return {
      success: true,
      precedent,
      message: `Precedent ${precedent.citation} indexed successfully.`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to index legal precedent." };
  }
}

export async function askGrokConstitutionalCounselAction(params: {
  question: string;
  topic?: string;
  targetCourt?: string;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const trimmed = params.question?.trim();
  if (!trimmed || trimmed.length < 3) {
    return { success: false, error: "Please enter a valid legal or constitutional inquiry." };
  }

  try {
    const { queryGrokLegalAssistant } = await import("@/lib/ai/grok");
    const result = await queryGrokLegalAssistant(trimmed, {
      topic: params.topic,
      targetCourt: params.targetCourt,
    });

    return {
      success: true,
      answer: result.answer,
      model: result.model,
      tokensUsed: result.tokensUsed,
      timestamp: result.timestamp,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to query Grok Constitutional Counsel.",
    };
  }
}

export async function searchConstitutionDatabaseAction(params: {
  query?: string;
  category?: string;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const { searchConstitutionalArticles, searchStatutoryRules } = await import(
      "@/lib/constitution/retrieval"
    );
    const query = params.query?.trim() || "";

    const [articles, rules] = await Promise.all([
      searchConstitutionalArticles(query, 50),
      searchStatutoryRules(query, 50),
    ]);

    return {
      success: true,
      articles,
      rules,
      totalCount: articles.length + rules.length,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to search constitution database.",
    };
  }
}

