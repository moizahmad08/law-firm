import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Briefcase, Filter, Search, ChevronRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { withUserContext } from "@/lib/database/context";
import { AppShell } from "@/components/shell/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EthicalWallBadge } from "@/components/ui/EthicalWallBadge";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

interface CasesPageProps {
  searchParams?: {
    restricted?: string;
  };
}

export default async function CasesPage({ searchParams }: CasesPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const isRestrictedOnly = searchParams?.restricted === "true";

  const { cases } = await withUserContext(user.id, async (tx) => {
    const caseList = await tx.case.findMany({
      where: isRestrictedOnly ? { isRestricted: true } : undefined,
      include: {
        status: true,
        client: true,
        courtRef: true,
        benchRef: true,
        assignments: {
          where: { isActive: true },
          include: { user: { select: { fullName: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return { cases: caseList };
  });

  const canCreate = user.role === Role.OFFICE_ADMIN || user.role === Role.LAWYER;

  return (
    <AppShell
      user={{
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      }}
      title="Litigation & Case Directory"
    >
      <div className="space-y-6">
        {/* Top Header & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-amber-400" />
              <span>Chambers Litigation Matters</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Active court briefs, constitutional petitions, civil suits, and appeals
            </p>
          </div>

          {canCreate && (
            <Link
              href="/cases/new"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors shadow-lg shadow-amber-500/10"
            >
              <Plus className="w-4 h-4" />
              <span>New Matter Institution</span>
            </Link>
          )}
        </div>

        {/* Case List Card */}
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-mono">
                Showing {cases.length} {isRestrictedOnly ? "Confidential (Ethical Wall)" : "Accessible"} Litigation Files
              </span>
              {isRestrictedOnly && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  RESTRICTED FILTER ACTIVE
                </span>
              )}
            </div>
            {isRestrictedOnly && (
              <Link
                href="/cases"
                className="text-xs text-amber-400 hover:text-amber-300 underline font-medium transition-colors"
              >
                Clear Filter &bull; Show All
              </Link>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="pb-3 font-medium">Case Number</th>
                  <th className="pb-3 font-medium">Title &amp; Matter Type</th>
                  <th className="pb-3 font-medium">Court / Bench</th>
                  <th className="pb-3 font-medium">Client</th>
                  <th className="pb-3 font-medium">Lead Counsel</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium text-right">Dossier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {cases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No active cases accessible to your profile.
                    </td>
                  </tr>
                ) : (
                  cases.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="py-3.5 font-mono font-bold text-amber-400">
                        <div className="flex items-center space-x-1.5">
                          <span>{c.caseNumber}</span>
                          <EthicalWallBadge isRestricted={c.isRestricted} size="sm" showLabel={false} />
                        </div>
                      </td>
                      <td className="py-3.5 max-w-xs">
                        <p className="font-semibold text-white truncate">{c.title}</p>
                        <p className="text-[11px] text-slate-400">{c.caseType}</p>
                      </td>
                      <td className="py-3.5 text-slate-300">
                        <div className="flex flex-col">
                          <span>{c.court}</span>
                          {c.benchRef && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              {c.benchRef.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 text-slate-300 font-medium">
                        {c.client.name}
                      </td>
                      <td className="py-3.5 text-slate-400">
                        {c.assignments[0]?.user.fullName || "Unassigned"}
                      </td>
                      <td className="py-3.5">
                        <StatusBadge status={c.status.code} showUrdu />
                      </td>
                      <td className="py-3.5 text-right">
                        <Link
                          href={`/cases/${c.id}`}
                          className="inline-flex items-center space-x-1 text-slate-400 hover:text-amber-400 transition-colors"
                        >
                          <span>Open Dossier</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
