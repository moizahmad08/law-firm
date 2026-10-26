"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Building,
  User,
  Calendar,
  Lock,
  ArrowRight,
  Search,
} from "lucide-react";
import clsx from "clsx";
import { createCaseAction, CaseActionState } from "@/lib/cases/actions";
import { runConflictCheck, ConflictMatch } from "@/lib/cases/conflict-check";

interface CaseFormProps {
  courts: Array<{ id: string; code: string; name: string }>;
  benches: Array<{ id: string; courtId: string; code: string; name: string }>;
  clients: Array<{ id: string; name: string; clientType: string }>;
  lawyers: Array<{ id: string; fullName: string }>;
  statuses: Array<{ id: string; code: string; label: string }>;
  currentUserId: string;
  currentUserName: string;
}

export function CaseForm({
  courts,
  benches,
  clients,
  lawyers,
  statuses,
  currentUserId,
  currentUserName,
}: CaseFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<CaseActionState>({ status: "IDLE" });

  // Conflict screening state
  const [conflictQuery, setConflictQuery] = useState("");
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);
  const [conflictMatches, setConflictMatches] = useState<ConflictMatch[]>([]);
  const [hasRunConflictCheck, setHasRunConflictCheck] = useState(false);

  // Form fields
  const [caseNumber, setCaseNumber] = useState("");
  const [title, setTitle] = useState("");
  const [selectedCourtId, setSelectedCourtId] = useState(courts[0]?.id || "");
  const [selectedBenchId, setSelectedBenchId] = useState("");
  const [caseType, setCaseType] = useState("Writ Petition");
  const [filingDate, setFilingDate] = useState("");
  const [clientId, setClientId] = useState(clients[0]?.id || "");
  const [assignedLawyerId, setAssignedLawyerId] = useState(lawyers[0]?.id || "");
  const [statusId, setStatusId] = useState(
    statuses.find((s) => s.code === "ACTIVE")?.id || statuses[0]?.id || ""
  );
  const [opposingParty, setOpposingParty] = useState("");
  const [opposingLawyer, setOpposingLawyer] = useState("");
  const [isRestricted, setIsRestricted] = useState(false);

  const selectedCourt = courts.find((c) => c.id === selectedCourtId);
  const courtBenches = benches.filter((b) => b.courtId === selectedCourtId);

  const handleConflictScreen = async () => {
    if (!conflictQuery.trim()) return;
    setIsCheckingConflict(true);
    try {
      const result = await runConflictCheck({
        partyName: conflictQuery.trim(),
        queriedByName: currentUserName,
        queriedByUserId: currentUserId,
      });
      setConflictMatches(result.matches);
      setHasRunConflictCheck(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCheckingConflict(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("caseNumber", caseNumber);
    formData.append("title", title);
    formData.append("court", selectedCourt?.name || "Lahore High Court");
    if (selectedCourtId) formData.append("courtId", selectedCourtId);
    if (selectedBenchId) formData.append("benchId", selectedBenchId);
    formData.append("caseType", caseType);
    if (filingDate) formData.append("filingDate", filingDate);
    formData.append("clientId", clientId);
    formData.append("statusId", statusId);
    formData.append("assignedLawyerId", assignedLawyerId);
    if (opposingParty) formData.append("opposingParty", opposingParty);
    if (opposingLawyer) formData.append("opposingLawyer", opposingLawyer);
    formData.append("isRestricted", isRestricted ? "true" : "false");

    startTransition(async () => {
      const res = await createCaseAction(state, formData);
      setState(res);
      if (res.status === "SUCCESS") {
        router.push("/cases");
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Step 1: Mandatory Conflict of Interest Pre-Screening */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center space-x-2.5 mb-2 text-amber-400">
          <ShieldAlert className="w-5 h-5" />
          <h2 className="text-sm font-bold text-white">
            Pre-Institution Conflict of Interest Screening
          </h2>
        </div>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          Screen prospective opposing parties, companies, and connected counsel against all historical chambers matters before filing. Powered by PostgreSQL trigram fuzzy matching.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={conflictQuery}
              onChange={(e) => setConflictQuery(e.target.value)}
              placeholder="Enter prospective party, company or opponent name (e.g. Indus River Authority)..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            type="button"
            onClick={handleConflictScreen}
            disabled={isCheckingConflict || !conflictQuery.trim()}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
          >
            {isCheckingConflict ? "Scanning..." : "Run Trigram Scan"}
          </button>
        </div>

        {hasRunConflictCheck && (
          <div className="mt-3">
            {conflictMatches.length === 0 ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>No conflicts detected across chambers files for &quot;{conflictQuery}&quot;. Clear to proceed.</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-rose-200">Potential Conflict Flagged! </span>
                    Found {conflictMatches.length} matching entity records in chambers.
                  </div>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {conflictMatches.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-white">{m.matchedName}</span>
                        <span className="text-[11px] text-slate-400 ml-2">({m.details})</span>
                      </div>
                      <span className="font-mono text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30">
                        {(m.similarityScore * 100).toFixed(0)}% Match
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 2: Main Case Form */}
      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
        <h2 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
          <Scale className="w-4 h-4 text-amber-400" />
          <span>Case Details &amp; Court Institution Information</span>
        </h2>

        {state.message && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {state.message}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Case Number *
            </label>
            <input
              type="text"
              required
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              placeholder="e.g. WP-405/2026 or CS-112/2026"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Case Title / Matter Caption *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Petitioner Name vs Federation of Pakistan"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Court *
            </label>
            <select
              value={selectedCourtId}
              onChange={(e) => setSelectedCourtId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              {courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {courtBenches.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Court Bench / Seat
              </label>
              <select
                value={selectedBenchId}
                onChange={(e) => setSelectedBenchId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">Select Bench...</option>
                {courtBenches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Matter Type *
            </label>
            <select
              value={caseType}
              onChange={(e) => setCaseType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="Writ Petition">Writ Petition (Constitutional)</option>
              <option value="Civil Suit">Civil Suit</option>
              <option value="Civil Appeal">Civil Appeal</option>
              <option value="Criminal Appeal">Criminal Appeal</option>
              <option value="Commercial Arbitration">Commercial Arbitration</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Filing / Institution Date
            </label>
            <input
              type="date"
              value={filingDate}
              onChange={(e) => setFilingDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Client *
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.clientType})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Lead Counsel Assigned *
            </label>
            <select
              value={assignedLawyerId}
              onChange={(e) => setAssignedLawyerId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              {lawyers.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.fullName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Opposing Party Name
            </label>
            <input
              type="text"
              value={opposingParty}
              onChange={(e) => setOpposingParty(e.target.value)}
              placeholder="e.g. Federation of Pakistan / Opponent Ltd"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Opposing Advocate of Record
            </label>
            <input
              type="text"
              value={opposingLawyer}
              onChange={(e) => setOpposingLawyer(e.target.value)}
              placeholder="e.g. Deputy Attorney General / Advocate Supreme Court"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Ethical Wall Confidentiality Toggle */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start space-x-3">
          <input
            id="restricted-toggle"
            type="checkbox"
            checked={isRestricted}
            onChange={(e) => setIsRestricted(e.target.checked)}
            className="mt-1 w-4 h-4 text-amber-500 bg-slate-900 border-slate-700 rounded focus:ring-0 cursor-pointer"
          />
          <div>
            <label htmlFor="restricted-toggle" className="text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer">
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>Mark as Confidential Matter (Ethical Wall Protected)</span>
            </label>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              When checked, this matter is restricted to explicitly assigned counsel only. Office Administrators, unassigned advocates, and clerks will be denied read and search access at the database level.
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-amber-500/10 disabled:opacity-50"
          >
            <span>{isPending ? "Instituting Matter..." : "Institute Case"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
