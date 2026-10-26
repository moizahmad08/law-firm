import { withUserContext } from "@/lib/database/context";

export interface SearchResultItem {
  type: "CASE" | "PARTY" | "CLIENT";
  id: string;
  caseId: string;
  title: string;
  subtitle: string;
  badge?: string;
  url: string;
  score: number;
}

export interface GlobalSearchResponse {
  query: string;
  totalCount: number;
  results: SearchResultItem[];
}

/**
 * Executes a permission-safe trigram search across litigation records.
 * STRICT SECURITY REQUIREMENT:
 * Must run inside withUserContext so that PostgreSQL RLS filters out unauthorized
 * and restricted cases at the database level. Queries return 0 rows, 0 snippets,
 * and 0 count for any cases blocked by ethical walls or missing assignments.
 */
export async function searchLitigation({
  query,
  userId,
  limit = 20,
}: {
  query: string;
  userId: string;
  limit?: number;
}): Promise<GlobalSearchResponse> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) {
    return { query: trimmed, totalCount: 0, results: [] };
  }

  return await withUserContext(userId, async (tx) => {
    // 1. Search Cases accessible to this user under RLS
    const matchedCases = await tx.$queryRaw<
      Array<{
        id: string;
        case_number: string;
        title: string;
        court: string;
        case_type: string;
        status_code: string;
        is_restricted: boolean;
        sim_title: number;
        sim_num: number;
      }>
    >`
      SELECT 
        c.id,
        c.case_number,
        c.title,
        c.court,
        c.case_type,
        cs.code as status_code,
        c.is_restricted,
        similarity(c.title, ${trimmed}) as sim_title,
        similarity(c.case_number, ${trimmed}) as sim_num
      FROM cases c
      JOIN case_statuses cs ON cs.id = c.status_id
      WHERE c.case_number ILIKE '%' || ${trimmed} || '%'
         OR c.title ILIKE '%' || ${trimmed} || '%'
         OR similarity(c.title, ${trimmed}) > 0.2
         OR similarity(c.case_number, ${trimmed}) > 0.2
      ORDER BY GREATEST(similarity(c.title, ${trimmed}), similarity(c.case_number, ${trimmed})) DESC
      LIMIT ${limit};
    `;

    // 2. Search Case Parties accessible to this user under RLS
    const matchedParties = await tx.$queryRaw<
      Array<{
        party_id: string;
        party_name: string;
        party_role: string;
        case_id: string;
        case_number: string;
        court: string;
        sim: number;
      }>
    >`
      SELECT 
        cp.id as party_id,
        cp.name as party_name,
        cp.party_role::text as party_role,
        c.id as case_id,
        c.case_number,
        c.court,
        similarity(cp.name, ${trimmed}) as sim
      FROM case_parties cp
      JOIN cases c ON c.id = cp.case_id
      WHERE cp.name ILIKE '%' || ${trimmed} || '%'
         OR similarity(cp.name, ${trimmed}) > 0.2
      ORDER BY similarity(cp.name, ${trimmed}) DESC
      LIMIT ${limit};
    `;

    // 3. Search Clients accessible to this user under RLS
    const matchedClients = await tx.$queryRaw<
      Array<{
        id: string;
        name: string;
        client_type: string;
        sim: number;
      }>
    >`
      SELECT 
        cl.id,
        cl.name,
        cl.client_type::text as client_type,
        similarity(cl.name, ${trimmed}) as sim
      FROM clients cl
      WHERE cl.name ILIKE '%' || ${trimmed} || '%'
         OR similarity(cl.name, ${trimmed}) > 0.2
      ORDER BY similarity(cl.name, ${trimmed}) DESC
      LIMIT ${limit};
    `;

    const results: SearchResultItem[] = [];

    // Map Cases
    for (const c of matchedCases) {
      results.push({
        type: "CASE",
        id: c.id,
        caseId: c.id,
        title: `${c.case_number} — ${c.title}`,
        subtitle: `${c.court} &bull; ${c.case_type}`,
        badge: c.status_code,
        url: `/cases/${c.id}`,
        score: Math.max(c.sim_title, c.sim_num),
      });
    }

    // Map Parties
    for (const p of matchedParties) {
      // Avoid duplicate if case is already matched with same text
      results.push({
        type: "PARTY",
        id: p.party_id,
        caseId: p.case_id,
        title: p.party_name,
        subtitle: `${p.party_role} in Case ${p.case_number} (${p.court})`,
        badge: p.party_role,
        url: `/cases/${p.case_id}`,
        score: p.sim,
      });
    }

    // Map Clients
    for (const cl of matchedClients) {
      results.push({
        type: "CLIENT",
        id: cl.id,
        caseId: "",
        title: cl.name,
        subtitle: `Chambers Client (${cl.client_type})`,
        badge: "CLIENT",
        url: `/cases`,
        score: cl.sim,
      });
    }

    return {
      query: trimmed,
      totalCount: results.length,
      results,
    };
  });
}
