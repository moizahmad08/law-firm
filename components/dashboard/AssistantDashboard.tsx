"use client";

import React from "react";
import Link from "next/link";
import {
  Calendar,
  FileCheck,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronRight,
  Briefcase,
} from "lucide-react";

export function AssistantDashboard() {
  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-teal-950/40 via-slate-900 to-slate-900 border border-teal-500/20 shadow-xl">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-semibold mb-2">
            <Clock className="w-3 h-3" />
            <span>Court Diary &amp; Cause List Operations</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Court Clerk &amp; Filings Desk</h1>
          <p className="text-xs text-slate-400 mt-1">
            Lahore High Court &amp; District Courts daily cause list, certified copies, and registrar office filings
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/cases"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition-colors shadow-lg shadow-teal-500/10"
          >
            <Briefcase className="w-4 h-4" />
            <span>All Case Files</span>
          </Link>
          <Link
            href="/research"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors"
          >
            <span>Precedents</span>
          </Link>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Cause List & Filings */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-400" />
              <span>Tomorrow&apos;s Court Cause List (Lahore High Court)</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">Date: 26-Oct-2026</span>
          </div>

          <div className="space-y-3">
            <Link
              href="/cases/WP-101/2026"
              className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-teal-500/40 transition-colors block group cursor-pointer space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-amber-400 group-hover:underline">WP-101/2026</span>
                <span className="text-[11px] font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                  Court 4 &bull; Item No. 12
                </span>
              </div>
              <p className="text-xs font-semibold text-white group-hover:text-teal-200">
                Indus Commercial Consortium vs Federation of Pakistan &amp; IRSA
              </p>
              <div className="text-xs text-slate-400 flex flex-wrap items-center justify-between pt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-500" /> Principal Seat, Lahore &bull; Adv. Salman Akram
                </span>
                <span className="text-xs text-teal-400 font-semibold flex items-center group-hover:translate-x-0.5 transition-transform">
                  Open Case File <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </span>
              </div>
              <p className="text-[11px] font-urdu text-slate-400 pt-1">
                فائل مکمل برائے پیشی کل صبح ساڑھے نو بجے
              </p>
            </Link>
          </div>
        </div>

        {/* Right 1 Col: Urgent Filings & Copy Branch */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800">
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-teal-400" />
              <span>Urgent Court Tasks</span>
            </h2>
            <ul className="text-xs space-y-2.5 text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 mt-0.5 shrink-0" />
                <span>Submit process fees &amp; summons copies for Case 402</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                <span>Collect certified copy of order sheet from Branch 3</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-600 mt-0.5 shrink-0" />
                <span className="text-slate-400">File Power of Attorney (Wakalatnama)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
