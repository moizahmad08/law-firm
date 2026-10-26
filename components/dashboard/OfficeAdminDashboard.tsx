"use client";

import React from "react";
import Link from "next/link";
import {
  Briefcase,
  Users,
  Calendar,
  ShieldAlert,
  Plus,
  Scale,
  Building,
  UserCheck,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EthicalWallBadge } from "@/components/ui/EthicalWallBadge";

export interface CaseItem {
  id: string;
  caseNumber: string;
  title: string;
  court: string;
  caseType: string;
  isRestricted: boolean;
  status: { code: string; label: string };
  client: { name: string; clientType: string };
  assignedCounsel?: string[];
}

interface OfficeAdminDashboardProps {
  stats: {
    totalAccessibleCases: number;
    totalClients: number;
    totalLawyers: number;
    unassignedCount: number;
  };
  cases: CaseItem[];
}

export function OfficeAdminDashboard({ stats, cases }: OfficeAdminDashboardProps) {
  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/20 shadow-xl">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-2">
            <Scale className="w-3 h-3" />
            <span>Chambers Practice Management</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Practice Overview & Operations</h1>
          <p className="text-xs text-slate-400 mt-1">
            Chambers-wide oversight of active litigation, client onboarding, and court assignments
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/cases/new"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors shadow-lg shadow-amber-500/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Case Filing</span>
          </Link>
          <Link
            href="/research"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors border border-slate-700 cursor-pointer"
          >
            <Scale className="w-4 h-4 text-amber-400" />
            <span>Precedent Research</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cases */}
        <Link
          href="/cases"
          className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-900 transition-all group block cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 group-hover:text-amber-300">Chambers Active Cases</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:bg-amber-500/20">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white group-hover:text-amber-400">{stats.totalAccessibleCases}</p>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>General litigation matters</span>
            <span className="text-amber-400 font-semibold group-hover:translate-x-0.5 transition-transform">&rarr;</span>
          </p>
        </Link>

        {/* Total Clients */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Institutional & Retainers</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalClients}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Active corporate & individual clients
          </p>
        </div>

        {/* Total Advocates */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Counsel in Chambers</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalLawyers}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            High Court & Supreme Court Advocates
          </p>
        </div>

        {/* Unassigned / Review Queue */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Unassigned Matters</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{stats.unassignedCount}</p>
          <p className="text-[11px] text-emerald-400 mt-1">
            All current cases assigned to counsel
          </p>
        </div>
      </div>

      {/* Ethical Wall Notification Banner */}
      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start space-x-3 text-rose-300">
        <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <span className="font-semibold text-rose-200">Ethical Wall Notice: </span>
          In strict compliance with Legal Ethics & Bar Council rules, confidential matters (e.g. CS-202/2026) are restricted to assigned counsel only. Office Administrators do not have visibility into restricted case files unless explicitly assigned.
        </div>
      </div>

      {/* Case Roster Table */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-amber-400" />
              <span>Chambers Litigation Roster</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Current active writ petitions, civil appeals, and corporate suits
            </p>
          </div>

          <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg">
            {cases.length} Accessible Matters
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800/80">
                <th className="pb-3 font-medium">Case Number</th>
                <th className="pb-3 font-medium">Title & Parties</th>
                <th className="pb-3 font-medium">Court / Bench</th>
                <th className="pb-3 font-medium">Client</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {cases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No active matters found in chambers.
                  </td>
                </tr>
              ) : (
                cases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="py-3.5 font-mono font-bold text-amber-400">
                      <div className="flex items-center space-x-2">
                        <span>{c.caseNumber}</span>
                        <EthicalWallBadge isRestricted={c.isRestricted} size="sm" showLabel={false} />
                      </div>
                    </td>
                    <td className="py-3.5 max-w-xs">
                      <p className="font-semibold text-white truncate">{c.title}</p>
                      <p className="text-[11px] text-slate-400">{c.caseType}</p>
                    </td>
                    <td className="py-3.5 text-slate-300">
                      <span className="bg-slate-800/70 px-2 py-0.5 rounded border border-slate-700/60">
                        {c.court}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-300 font-medium">
                      {c.client.name}
                    </td>
                    <td className="py-3.5">
                      <StatusBadge status={c.status.code} showUrdu />
                    </td>
                    <td className="py-3.5 text-right">
                      <Link
                        href={`/cases/${c.id}`}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-amber-500 hover:text-slate-950 text-slate-300 text-xs font-semibold transition-all shadow-sm"
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
  );
}
