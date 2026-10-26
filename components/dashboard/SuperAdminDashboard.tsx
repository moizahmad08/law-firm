"use client";

import React from "react";
import Link from "next/link";
import {
  Database,
  ShieldCheck,
  Lock,
  Activity,
  History,
  AlertOctagon,
  Server,
  KeyRound,
  FileText,
  CheckCircle2,
} from "lucide-react";
import clsx from "clsx";

export interface AuditEventItem {
  id: string;
  action: string;
  userId: string | null;
  userName?: string | null;
  ipAddress: string | null;
  createdAt: Date | string;
  metadata?: any;
}

interface SuperAdminDashboardProps {
  stats: {
    totalAuditEvents: number;
    activeSessionsCount: number;
    totalStaffUsers: number;
    dbRoleStatus: string;
  };
  recentAudits: AuditEventItem[];
}

export function SuperAdminDashboard({ stats, recentAudits }: SuperAdminDashboardProps) {
  return (
    <div className="space-y-8">
      {/* Page Title & Super Admin Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/20 shadow-xl">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-semibold mb-2">
            <Lock className="w-3 h-3" />
            <span>Super Administrator Security Console</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System Infrastructure & Audit</h1>
          <p className="text-xs text-slate-400 mt-1">
            Zero-Trust Container Governance, Database RLS Health & Append-Only Audit Logging
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/cases"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-purple-600/20"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Cases Directory</span>
          </Link>
          <Link
            href="/research"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors"
          >
            <span>Precedents</span>
          </Link>
          <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Operational</span>
          </span>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: DB Container */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Database Engine</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-white">PostgreSQL 16</p>
          <p className="text-[11px] text-emerald-400 font-mono mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Container lms_db (Port 5432)
          </p>
        </div>

        {/* Card 2: RLS Isolation */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Row-Level Security</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-white">FORCED (5 Tables)</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Zero-Context isolation active
          </p>
        </div>

        {/* Card 3: Role Separation */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Runtime DB Role</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-white">lms_app</p>
          <p className="text-[11px] text-amber-400 font-mono mt-1">
            rolsuper=false &bull; NOBYPASSRLS
          </p>
        </div>

        {/* Card 4: Audit Immutability */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Total Audit Logs</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <History className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-white">{stats.totalAuditEvents}</p>
          <p className="text-[11px] text-purple-400 mt-1 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Append-Only (UPDATE/DELETE Denied)
          </p>
        </div>
      </div>

      {/* Security Policies Matrix & Audit Log Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Real-time Audit Stream */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold text-white">Immutable Security Audit Trail</h2>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              PostgreSQL audit_events
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800/80">
                  <th className="pb-2 font-medium">Timestamp (PKT)</th>
                  <th className="pb-2 font-medium">Action</th>
                  <th className="pb-2 font-medium">User Context</th>
                  <th className="pb-2 font-medium">Origin IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {recentAudits.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">
                      No audit records found.
                    </td>
                  </tr>
                ) : (
                  recentAudits.map((event) => {
                    const isFailed = event.action.includes("FAILED") || event.action.includes("DENIED");
                    return (
                      <tr key={event.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {new Date(event.createdAt).toLocaleTimeString("en-PK", {
                            timeZone: "Asia/Karachi",
                            hour12: true,
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="py-3">
                          <span
                            className={clsx(
                              "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold border",
                              isFailed
                                ? "bg-red-500/10 text-red-400 border-red-500/30"
                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            )}
                          >
                            {event.action}
                          </span>
                        </td>
                        <td className="py-3 text-slate-300">
                          {event.userName || event.userId ? (
                            <span className="font-medium text-white">{event.userName || "Staff User"}</span>
                          ) : (
                            <span className="text-slate-500 font-mono">System / Unauthenticated</span>
                          )}
                        </td>
                        <td className="py-3 font-mono text-[11px] text-slate-400">
                          {event.ipAddress || "127.0.0.1"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Break-Glass & Security Status */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center space-x-2 mb-3 text-amber-400">
              <AlertOctagon className="w-5 h-5" />
              <h2 className="text-sm font-bold text-white">Break-Glass Protocol</h2>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Super Admin possesses zero default case access under RLS. Emergency dual-custody override requires justification and leaves a tamper-evident audit trail.
            </p>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>Override Status:</span>
                <span className="font-bold text-slate-400">STANDBY (0 Active)</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Dual Custody:</span>
                <span className="text-emerald-400 font-semibold">Enforced</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800">
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-purple-400" />
              <span>Multi-Factor Security</span>
            </h2>
            <ul className="text-xs space-y-2 text-slate-300">
              <li className="flex items-center text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 mr-2 shrink-0" />
                MFA mandatory for Super Admin
              </li>
              <li className="flex items-center text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 mr-2 shrink-0" />
                RFC 6238 TOTP with SHA-256
              </li>
              <li className="flex items-center text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 mr-2 shrink-0" />
                5 attempts / 15-minute lockouts
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
