import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AppShell } from "@/components/shell/AppShell";
import { LegalResearchPortal } from "@/components/research/LegalResearchPortal";
import { searchPrecedents } from "@/lib/research/service";
import { PrecedentCourtType } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function LegalResearchPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Pre-load initial precedent benchmarks under user context
  let initialPrecedents: any[] = [];
  try {
    const initialSearch = await searchPrecedents(user.id, {
      targetCourtType: PrecedentCourtType.HIGH_COURT_SINDH,
    });
    initialPrecedents = initialSearch.results as any[];
  } catch (err) {
    console.warn("Could not pre-load initial precedents:", err);
  }

  return (
    <AppShell
      user={{
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      }}
      title="Pakistan Legal Research & Precedent Hierarchy"
    >
      <LegalResearchPortal
        initialPrecedents={initialPrecedents}
        defaultTargetCourt={PrecedentCourtType.HIGH_COURT_SINDH}
      />
    </AppShell>
  );
}
