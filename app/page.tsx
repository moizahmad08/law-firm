import React from "react";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { withUserContext } from "@/lib/database/context";
import { prisma } from "@/lib/database/client";
import { AppShell } from "@/components/shell/AppShell";
import { SuperAdminDashboard } from "@/components/dashboard/SuperAdminDashboard";
import { OfficeAdminDashboard } from "@/components/dashboard/OfficeAdminDashboard";
import { LawyerDashboard } from "@/components/dashboard/LawyerDashboard";
import { AssistantDashboard } from "@/components/dashboard/AssistantDashboard";
import { FinanceAdminDashboard } from "@/components/dashboard/FinanceAdminDashboard";
import { getFinancialOverview } from "@/lib/finance/reports";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  // If unauthenticated, redirect to login page
  if (!user) {
    redirect("/login");
  }

  // Fetch isolated data under user context via PostgreSQL RLS
  const { cases, clients } = await withUserContext(user.id, async (tx) => {
    const accessibleCases = await tx.case.findMany({
      include: {
        status: { select: { code: true, label: true } },
        client: { select: { name: true, clientType: true } },
        assignments: {
          include: {
            user: { select: { fullName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const accessibleClients = await tx.client.findMany({
      select: { id: true, name: true, clientType: true },
    });

    return {
      cases: accessibleCases,
      clients: accessibleClients,
    };
  });

  // Additional counts & stats
  const totalLawyers = await prisma.user.count({
    where: { role: Role.LAWYER, isActive: true },
  });

  const activeSessionsCount = await prisma.session.count({
    where: { revokedAt: null },
  });

  const totalAuditEvents = await prisma.auditEvent.count();

  const recentAuditsRaw = await prisma.auditEvent.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { fullName: true } },
    },
  });

  const recentAudits = recentAuditsRaw.map((a) => ({
    id: a.id,
    action: a.action,
    userId: a.userId,
    userName: a.user?.fullName || null,
    ipAddress: a.ipAddress,
    createdAt: a.createdAt,
    metadata: a.afterState,
  }));

  const formattedCases = cases.map((c) => ({
    id: c.id,
    caseNumber: c.caseNumber,
    title: c.title,
    court: c.court,
    caseType: c.caseType,
    isRestricted: c.isRestricted,
    status: c.status,
    client: c.client,
    assignedCounsel: c.assignments.map((a) => a.user.fullName),
  }));

  const financeOverview =
    user.role === Role.FINANCE_ADMIN ? await getFinancialOverview(user.id) : undefined;

  return (
    <AppShell
      user={{
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      }}
      title="Chambers Operations"
    >
      {user.role === Role.SUPER_ADMIN && (
        <SuperAdminDashboard
          stats={{
            totalAuditEvents,
            activeSessionsCount,
            totalStaffUsers: totalLawyers + 3,
            dbRoleStatus: "lms_app (Restricted RLS)",
          }}
          recentAudits={recentAudits}
        />
      )}

      {user.role === Role.OFFICE_ADMIN && (
        <OfficeAdminDashboard
          stats={{
            totalAccessibleCases: formattedCases.length,
            totalClients: clients.length,
            totalLawyers,
            unassignedCount: 0,
          }}
          cases={formattedCases}
        />
      )}

      {user.role === Role.LAWYER && (
        <LawyerDashboard
          user={{ fullName: user.fullName }}
          cases={formattedCases}
        />
      )}

      {user.role === Role.ASSISTANT && <AssistantDashboard />}

      {user.role === Role.FINANCE_ADMIN && (
        <FinanceAdminDashboard overview={financeOverview} />
      )}
    </AppShell>
  );
}
