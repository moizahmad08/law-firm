import { prisma } from "@/lib/database/client";
import { withUserContext } from "@/lib/database/context";
import { recordAuthAudit } from "@/lib/auth/audit";

export interface ConflictMatch {
  sourceType: "CLIENT" | "CASE_PARTY" | "OPPOSING_PARTY" | "OPPOSING_LAWYER";
  matchedName: string;
  matchedCnic?: string | null;
  caseId?: string | null;
  caseNumber?: string | null;
  caseTitle?: string | null;
  court?: string | null;
  partyRole?: string | null;
  similarityScore: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  details: string;
}

export interface ConflictCheckResult {
  queriedName: string;
  queriedCnic?: string | null;
  matchFound: boolean;
  matches: ConflictMatch[];
  conflictRecordId: string;
}

/**
 * Searches across all chambers cases, clients, and parties for potential conflicts of interest.
 * Respects viewer permissions under PostgreSQL RLS and never leaks restricted cases (Master Spec 5.1).
 * Uses pg_trgm similarity to catch fuzzy matches, phonetics, and slight misspellings.
 */
export async function runConflictCheck({
  partyName,
  cnic,
  queriedByUserId,
  queriedByName,
  similarityThreshold = 0.35,
}: {
  partyName: string;
  cnic?: string | null;
  queriedByUserId?: string | null;
  queriedByName: string;
  similarityThreshold?: number;
}): Promise<ConflictCheckResult> {
  const trimmedName = partyName.trim();
  const trimmedCnic = cnic?.trim() || null;
  const matches: ConflictMatch[] = [];

  const executeSearch = async (client: any) => {
    // 1. Check Case Parties via Trigram Similarity & Exact CNIC
    const partyMatches = trimmedCnic
      ? await client.$queryRaw<
          Array<{
            party_name: string;
            party_cnic: string | null;
            party_role: string;
            case_id: string;
            case_number: string;
            case_title: string;
            court: string;
            sim: number;
          }>
        >`
          SELECT 
            cp.name as party_name,
            cp.cnic as party_cnic,
            cp.party_role::text as party_role,
            c.id as case_id,
            c.case_number,
            c.title as case_title,
            c.court,
            similarity(cp.name, ${trimmedName}) as sim
          FROM case_parties cp
          JOIN cases c ON c.id = cp.case_id
          WHERE similarity(cp.name, ${trimmedName}) >= ${similarityThreshold}
             OR cp.cnic = ${trimmedCnic}
          ORDER BY sim DESC
          LIMIT 20;
        `
      : await client.$queryRaw<
          Array<{
            party_name: string;
            party_cnic: string | null;
            party_role: string;
            case_id: string;
            case_number: string;
            case_title: string;
            court: string;
            sim: number;
          }>
        >`
          SELECT 
            cp.name as party_name,
            cp.cnic as party_cnic,
            cp.party_role::text as party_role,
            c.id as case_id,
            c.case_number,
            c.title as case_title,
            c.court,
            similarity(cp.name, ${trimmedName}) as sim
          FROM case_parties cp
          JOIN cases c ON c.id = cp.case_id
          WHERE similarity(cp.name, ${trimmedName}) >= ${similarityThreshold}
          ORDER BY sim DESC
          LIMIT 20;
        `;

    // 2. Check Existing Clients
    const clientMatches = trimmedCnic
      ? await client.$queryRaw<
          Array<{
            client_name: string;
            client_cnic: string | null;
            sim: number;
          }>
        >`
          SELECT 
            cl.name as client_name,
            cl.cnic as client_cnic,
            similarity(cl.name, ${trimmedName}) as sim
          FROM clients cl
          WHERE similarity(cl.name, ${trimmedName}) >= ${similarityThreshold}
             OR cl.cnic = ${trimmedCnic}
          ORDER BY sim DESC
          LIMIT 10;
        `
      : await client.$queryRaw<
          Array<{
            client_name: string;
            client_cnic: string | null;
            sim: number;
          }>
        >`
          SELECT 
            cl.name as client_name,
            cl.cnic as client_cnic,
            similarity(cl.name, ${trimmedName}) as sim
          FROM clients cl
          WHERE similarity(cl.name, ${trimmedName}) >= ${similarityThreshold}
          ORDER BY sim DESC
          LIMIT 10;
        `;

    // 3. Check Opposing Party / Lawyer in accessible cases
    const opposingMatches = await client.$queryRaw<
      Array<{
        case_id: string;
        case_number: string;
        case_title: string;
        opposing_party: string | null;
        opposing_lawyer: string | null;
        party_sim: number;
        lawyer_sim: number;
      }>
    >`
      SELECT 
        c.id as case_id,
        c.case_number,
        c.title as case_title,
        c.opposing_party,
        c.opposing_lawyer,
        COALESCE(similarity(c.opposing_party, ${trimmedName}), 0) as party_sim,
        COALESCE(similarity(c.opposing_lawyer, ${trimmedName}), 0) as lawyer_sim
      FROM cases c
      WHERE (c.opposing_party IS NOT NULL AND similarity(c.opposing_party, ${trimmedName}) >= ${similarityThreshold})
         OR (c.opposing_lawyer IS NOT NULL AND similarity(c.opposing_lawyer, ${trimmedName}) >= ${similarityThreshold})
      LIMIT 10;
    `;

    return { partyMatches, clientMatches, opposingMatches };
  };

  const { partyMatches, clientMatches, opposingMatches } = queriedByUserId
    ? await withUserContext(queriedByUserId, (tx) => executeSearch(tx))
    : await executeSearch(prisma);

  for (const pm of partyMatches) {
    const isAdverse =
      pm.party_role === "RESPONDENT" ||
      pm.party_role === "DEFENDANT" ||
      pm.party_role === "OPPOSING_COUNSEL";

    matches.push({
      sourceType: "CASE_PARTY",
      matchedName: pm.party_name,
      matchedCnic: pm.party_cnic,
      caseId: pm.case_id,
      caseNumber: pm.case_number,
      caseTitle: pm.case_title,
      court: pm.court,
      partyRole: pm.party_role,
      similarityScore: Number(pm.sim.toFixed(2)),
      severity: isAdverse ? "CRITICAL" : "HIGH",
      details: `Matched ${pm.party_role} in ${pm.case_number} (${pm.court}) with ${(pm.sim * 100).toFixed(0)}% name match`,
    });
  }

  for (const cm of clientMatches) {
    if (!matches.some((m) => m.matchedName.toLowerCase() === cm.client_name.toLowerCase())) {
      matches.push({
        sourceType: "CLIENT",
        matchedName: cm.client_name,
        matchedCnic: cm.client_cnic,
        similarityScore: Number(cm.sim.toFixed(2)),
        severity: "HIGH",
        details: `Existing Chambers Client with ${(cm.sim * 100).toFixed(0)}% name match`,
      });
    }
  }

  for (const om of opposingMatches) {
    if (om.opposing_party && om.party_sim >= similarityThreshold) {
      if (!matches.some((m) => m.caseNumber === om.case_number && m.sourceType === "OPPOSING_PARTY")) {
        matches.push({
          sourceType: "OPPOSING_PARTY",
          matchedName: om.opposing_party,
          caseId: om.case_id,
          caseNumber: om.case_number,
          caseTitle: om.case_title,
          similarityScore: Number(om.party_sim.toFixed(2)),
          severity: "CRITICAL",
          details: `Adverse Opposing Party in Case ${om.case_number}`,
        });
      }
    }

    if (om.opposing_lawyer && om.lawyer_sim >= similarityThreshold) {
      if (!matches.some((m) => m.caseNumber === om.case_number && m.sourceType === "OPPOSING_LAWYER")) {
        matches.push({
          sourceType: "OPPOSING_LAWYER",
          matchedName: om.opposing_lawyer,
          caseId: om.case_id,
          caseNumber: om.case_number,
          caseTitle: om.case_title,
          similarityScore: Number(om.lawyer_sim.toFixed(2)),
          severity: "MEDIUM",
          details: `Opposing Advocate of record in Case ${om.case_number}`,
        });
      }
    }
  }

  const matchFound = matches.length > 0;

  // 4. Save Screening Record in conflict_check_records
  const record = await prisma.conflictCheckRecord.create({
    data: {
      queriedByName,
      queriedByUserId: queriedByUserId || null,
      queriedPartyName: trimmedName,
      queriedCnic: trimmedCnic,
      matchFound,
      matchedDetails: matches as any,
      isCleared: !matchFound,
    },
  });

  // 5. Audit Log
  await recordAuthAudit({
    userId: queriedByUserId || null,
    action: matchFound ? "CONFLICT_CHECK_MATCH_DETECTED" : "CONFLICT_CHECK_CLEARED_AUTO",
    metadata: {
      queriedName: trimmedName,
      matchesCount: matches.length,
      recordId: record.id,
    },
  });

  return {
    queriedName: trimmedName,
    queriedCnic: trimmedCnic,
    matchFound,
    matches,
    conflictRecordId: record.id,
  };
}

/**
 * Authorizes clearance for a flagged conflict of interest with recorded partner/counsel justification.
 */
export async function clearConflict({
  conflictRecordId,
  clearedByUserId,
  clearanceNotes,
}: {
  conflictRecordId: string;
  clearedByUserId: string;
  clearanceNotes: string;
}): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: clearedByUserId },
  });

  if (!user || (user.role !== "OFFICE_ADMIN" && user.role !== "LAWYER" && user.role !== "SUPER_ADMIN")) {
    throw new Error("Unauthorized: Only an Office Administrator or Counsel may clear a conflict of interest.");
  }

  await withUserContext(clearedByUserId, async (tx) => {
    await tx.conflictCheckRecord.update({
      where: { id: conflictRecordId },
      data: {
        isCleared: true,
        clearedByUserId,
        clearedAt: new Date(),
        clearanceNotes: clearanceNotes.trim(),
      },
    });
  });

  await recordAuthAudit({
    userId: clearedByUserId,
    action: "CONFLICT_CHECK_MANUALLY_CLEARED",
    metadata: {
      conflictRecordId,
      notes: clearanceNotes.trim(),
    },
  });

  return true;
}
