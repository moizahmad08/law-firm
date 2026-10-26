"use client";

import React from "react";
import Link from "next/link";
import {
  Briefcase,
  Calendar,
  Clock,
  FileText,
  Building,
  CheckCircle2,
  ChevronRight,
  Shield,
  AlertCircle,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EthicalWallBadge } from "@/components/ui/EthicalWallBadge";
import { CaseItem } from "./OfficeAdminDashboard";

interface LawyerDashboardProps {
  user: {
    fullName: string;
  };
  cases: CaseItem[];
}

export function LawyerDashboard({ user, cases }: LawyerDashboardProps) {
  const hasRestricted = cases.some((c) => c.isRestricted);

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-blue-500/20 shadow-xl">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-2">
            <Briefcase className="w-3 h-3" />
            <span>Advocate High Court &bull; Counsel Practice</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">My Active Matters & Cause List</h1>
          <p className="text-xs text-slate-400 mt-1">
            Brief preparation, cause list tracking, and courtroom representation
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href="/cases"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-blue-600/20"
          >
            <Briefcase className="w-4 h-4" />
            <span>All Assigned Cases ({cases.length})</span>
          </Link>
          <Link
            href="/research"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors"
          >
            <span>Precedent Engine</span>
          </Link>
        </div>
      </div>

      {/* Restricted Case Notice if lawyer holds confidential assignment */}
      {hasRestricted && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-3 text-rose-300">
          <Shield className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <span className="font-semibold text-rose-200">Ethical Wall Active: </span>
            You are designated lead counsel on one or more restricted matters. Access to case documents and notes is isolated to your counsel profile.
          </div>
        </div>
      )}

      {/* Upcoming Hearings & Tasks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: My Cases Roster */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-400" />
                <span>My Assigned Cases</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Litigation files under your direct conduct
              </p>
            </div>
            <Link
              href="/cases"
              className="text-xs text-amber-400 hover:text-amber-300 font-medium underline transition-colors"
            >
              View Full Directory &rarr;
            </Link>
          </div>

          <div className="space-y-4">
            {cases.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No cases currently assigned. Check with Chambers Administrator.
              </div>
            ) : (
              cases.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm font-bold text-amber-400">
                        {c.caseNumber}
                      </span>
                      <EthicalWallBadge isRestricted={c.isRestricted} />
                    </div>
                    <StatusBadge status={c.status.code} showUrdu />
                  </div>

                  <h3 className="text-sm font-semibold text-white mb-2">{c.title}</h3>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center space-x-2 text-xs text-slate-400">
                      <div className="flex items-center space-x-1">
                        <Building className="w-3.5 h-3.5 text-slate-500" />
                        <span>{c.court}</span>
                      </div>
                      <span className="text-slate-600">&bull;</span>
                      <div>
                        <span className="text-slate-500">Client: </span>
                        <span className="text-slate-300 font-medium">{c.client.name}</span>
                      </div>
                    </div>
                    <Link
                      href={`/cases/${c.id}`}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors shadow-sm self-start sm:self-auto"
                    >
                      <span>Open Dossier</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 Col: Cause List & Upcoming Hearings */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800 text-amber-400">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <h2 className="text-sm font-bold text-white">Upcoming Hearings</h2>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Cause List</span>
            </div>

            <div className="space-y-3">
              <Link
                href={`/cases/${cases[0]?.id || 'WP-101/2026'}`}
                className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-amber-500/40 transition-colors block group cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-amber-400 font-semibold group-hover:underline">
                    WP-101/2026
                  </span>
                  <span className="text-[10px] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded border border-amber-500/20">
                    Tomorrow &bull; 09:30 AM
                  </span>
                </div>
                <p className="text-xs font-medium text-white group-hover:text-amber-200">
                  Lahore High Court &bull; Courtroom 4
                </p>
                <p className="text-[11px] text-slate-400">
                  Division Bench: Mr. Justice Shahid Karim &amp; Mr. Justice Asim Hafeez
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-urdu text-slate-400">
                    پیشی برائے ابتدائی سماعت و حکم امتناعی
                  </span>
                  <span className="text-[11px] text-amber-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center">
                    Docket &rarr;
                  </span>
                </div>
              </Link>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5 opacity-70">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-300 font-semibold">Civil Appeal 44/2026</span>
                  <span className="text-[10px] text-slate-400">In 5 Days</span>
                </div>
                <p className="text-xs font-medium text-slate-300">Supreme Court of Pakistan &bull; Branch Registry</p>
                <p className="text-[11px] text-slate-500">Regular Hearing on Merits</p>
              </div>
            </div>
          </div>

          {/* Pending Tasks & Briefs */}
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center space-x-2 mb-3 text-blue-400">
              <FileText className="w-4 h-4" />
              <h2 className="text-sm font-bold text-white">Pending Briefs &amp; Drafts</h2>
            </div>
            <ul className="text-xs space-y-2 text-slate-300">
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                <span>Finalize Rejoinder to Parawise Comments (WP-101)</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-600 mt-0.5 shrink-0" />
                <span className="text-slate-400">Review certified copies from LHC copy branch</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
