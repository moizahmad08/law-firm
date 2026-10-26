import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/database/client";
import { AppShell } from "@/components/shell/AppShell";
import { CaseForm } from "@/components/cases/CaseForm";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function NewCasePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (user.role !== Role.OFFICE_ADMIN && user.role !== Role.LAWYER) {
    redirect("/access-denied");
  }

  // Load master data for dropdowns
  const courts = await prisma.court.findMany({
    where: { isActive: true },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });

  const benches = await prisma.bench.findMany({
    where: { isActive: true },
    select: { id: true, courtId: true, code: true, name: true },
    orderBy: { name: "asc" },
  });

  const clients = await prisma.client.findMany({
    select: { id: true, name: true, clientType: true },
    orderBy: { name: "asc" },
  });

  const lawyers = await prisma.user.findMany({
    where: { role: Role.LAWYER, isActive: true },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  const statuses = await prisma.caseStatus.findMany({
    where: { isActive: true },
    select: { id: true, code: true, label: true },
    orderBy: { displayOrder: "asc" },
  });

  return (
    <AppShell
      user={{
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      }}
      title="Institute New Matter"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            New Case Institution &amp; Onboarding
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Filing constitutional writ petitions, civil suits, and commercial appeals
          </p>
        </div>

        <CaseForm
          courts={courts}
          benches={benches}
          clients={clients}
          lawyers={lawyers}
          statuses={statuses}
          currentUserId={user.id}
          currentUserName={user.fullName}
        />
      </div>
    </AppShell>
  );
}
