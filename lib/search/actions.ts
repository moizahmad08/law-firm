"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { searchLitigation, GlobalSearchResponse } from "@/lib/search/global-search";

export async function searchLitigationAction(query: string): Promise<GlobalSearchResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      query: query.trim(),
      totalCount: 0,
      results: [],
    };
  }

  return await searchLitigation({
    query,
    userId: user.id,
    limit: 25,
  });
}
