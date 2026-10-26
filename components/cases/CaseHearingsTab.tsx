"use client";

import React, { useState, useTransition } from "react";
import {
  Calendar,
  Clock,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Gavel,
  ChevronRight,
  CheckSquare,
} from "lucide-react";
import {
  scheduleHearingAction,
  recordHearingOutcomeAction,
} from "@/lib/hearings/actions";
import { HearingStatus } from "@prisma/client";

interface HearingItem {
  id: string;
  court: string;
  hearingDate: Date | string;
  purpose: string;
  status: HearingStatus;
  outcome: string | null;
  nextDate: Date | string | null;
  actionRequired: string | null;
  notes: string | null;
  benchRef?: { name: string; code: string } | null;
  judgeRef?: { fullName: string; designation: string } | null;
}

interface CaseHearingsTabProps {
  caseId: string;
  defaultCourt: string;
  hearings: HearingItem[];
  canEdit: boolean;
}

export function CaseHearingsTab({
  caseId,
  defaultCourt,
  hearings,
  canEdit,
}: CaseHearingsTabProps) {
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [outcomeHearing, setOutcomeHearing] = useState<HearingItem | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();

  const formatPST = (d: Date | string) => {
    try {
      return new Intl.DateTimeFormat("en-PK", {
        timeZone: "Asia/Karachi",
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(d));
    } catch {
      return new Date(d).toLocaleString();
    }
  };

  const handleScheduleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("caseId", caseId);

    startTransition(async () => {
      const res = await scheduleHearingAction(formData);
      if (res.success) {
        setMessage({ text: "Court hearing scheduled successfully.", type: "success" });
        setIsScheduleOpen(false);
      } else {
        setMessage({ text: res.error || "Failed to schedule hearing", type: "error" });
      }
    });
  };

  const handleOutcomeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!outcomeHearing) return;
    const formData = new FormData(e.currentTarget);
    formData.append("hearingId", outcomeHearing.id);
    formData.append("caseId", caseId);

    startTransition(async () => {
      const res = await recordHearingOutcomeAction(formData);
      if (res.success) {
        setMessage({ text: "Hearing outcome recorded successfully.", type: "success" });
        setOutcomeHearing(null);
      } else {
        setMessage({ text: res.error || "Failed to record outcome", type: "error" });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Gavel className="w-5 h-5 text-amber-400" />
            <span>Court Hearings & Cause List Calendar</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Pakistan Standard Time (Asia/Karachi) hearing schedule, judge roasters, and judicial interim outcomes.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => setIsScheduleOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors shadow-lg shadow-amber-500/10 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Hearing</span>
          </button>
        )}
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl border flex items-center space-x-2 text-xs ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Hearings Timeline List */}
      <div className="space-y-3">
        {hearings.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-xs">
            No court hearings recorded for this matter. Click &ldquo;Schedule Hearing&rdquo; to add a court appearance.
          </div>
        ) : (
          hearings.map((h) => {
            const isAdjourned = h.status === "ADJOURNED";
            const isHeard = h.status === "HEARD" || h.status === "DECIDED";

            return (
              <div
                key={h.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Calendar className="w-4 h-4" />
                    </span>
                    <div>
                      <span className="font-mono text-xs font-bold text-white">
                        {formatPST(h.hearingDate)}
                      </span>
                      <span className="ml-2 text-xs text-slate-400 font-medium">
                        {h.court}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded border ${
                        h.status === "SCHEDULED"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                          : isAdjourned
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      }`}
                    >
                      {h.status}
                    </span>

                    {canEdit && h.status === "SCHEDULED" && (
                      <button
                        onClick={() => setOutcomeHearing(h)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1"
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                        <span>Record Outcome</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Purpose: </span>
                    <span className="text-white font-medium">{h.purpose}</span>
                  </div>
                  {(h.benchRef || h.judgeRef) && (
                    <div className="text-slate-400">
                      <span>Presiding: </span>
                      <span className="text-slate-200">
                        {h.judgeRef?.fullName || h.benchRef?.name}
                      </span>
                    </div>
                  )}
                </div>

                {h.outcome && (
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5 text-xs">
                    <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Court Order / Outcome:</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{h.outcome}</p>
                    {h.actionRequired && (
                      <p className="text-amber-300/90 text-[11px]">
                        <strong>Action Required: </strong> {h.actionRequired}
                      </p>
                    )}
                    {h.nextDate && (
                      <p className="text-slate-400 text-[11px] font-mono">
                        Next Date of Hearing: <strong className="text-white">{formatPST(h.nextDate)}</strong>
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Schedule Hearing Modal */}
      {isScheduleOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Schedule Next Court Appearance</span>
            </h3>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Court *
                  </label>
                  <input
                    name="court"
                    required
                    defaultValue={defaultCourt}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Date & Time (Asia/Karachi) *
                  </label>
                  <input
                    type="datetime-local"
                    name="hearingDate"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Purpose of Hearing *
                </label>
                <input
                  name="purpose"
                  required
                  placeholder="e.g. Arguments on Stay Application / Final Arguments / Witness Statement"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Chambers Instructions / Notes
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="e.g. Bring reported citations on PLD 2024 SC 112..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsScheduleOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
                  <span>Schedule Appearance</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Outcome Modal */}
      {outcomeHearing && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-400" />
              <span>Record Court Outcome</span>
            </h3>

            <form onSubmit={handleOutcomeSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Hearing Result Status *
                  </label>
                  <select
                    name="status"
                    required
                    defaultValue="ADJOURNED"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="ADJOURNED">Adjourned</option>
                    <option value="HEARD">Heard & Concluded</option>
                    <option value="DECIDED">Decided / Judgment Reserved</option>
                    <option value="CANCELLED">Discharged / Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Next Date of Hearing (If Adjourned)
                  </label>
                  <input
                    type="datetime-local"
                    name="nextDate"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Court Order / Outcome Summary *
                </label>
                <textarea
                  name="outcome"
                  required
                  rows={3}
                  placeholder="Record summary of court proceedings, interim stay continuation, or directions given..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Action Required before Next Date
                </label>
                <input
                  name="actionRequired"
                  placeholder="e.g. File written reply / Deposit court fees / Produce witness list"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setOutcomeHearing(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Save Outcome</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
