"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Building,
  UserCheck,
  Calendar,
  Lock,
  ArrowLeft,
  RefreshCw,
  Users,
  FileText,
  Clock,
  ShieldAlert,
  Gavel,
  CheckSquare,
  DollarSign,
  Sparkles,
  MessageSquare,
  Edit,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EthicalWallBadge } from "@/components/ui/EthicalWallBadge";
import { StatusTransitionModal } from "./StatusTransitionModal";
import { CaseDocumentsTab } from "./CaseDocumentsTab";
import { CaseHearingsTab } from "./CaseHearingsTab";
import { CaseTasksTab } from "./CaseTasksTab";
import { CaseFinanceTab } from "./CaseFinanceTab";
import { CaseAiAssistantTab } from "./CaseAiAssistantTab";
import { CaseDraftingTab } from "./CaseDraftingTab";
import { CaseCommunicationsTab } from "./CaseCommunicationsTab";

interface CaseDetailViewProps {
  caseData: {
    id: string;
    caseNumber: string;
    title: string;
    court: string;
    caseType: string;
    jurisdiction: string;
    filingDate: Date | null;
    isRestricted: boolean;
    status: { id: string; code: string; label: string };
    client: { id: string; name: string; clientType: string; mobile: string; email: string | null };
    courtRef?: { name: string } | null;
    benchRef?: { name: string } | null;
    parties: Array<{
      id: string;
      name: string;
      partyRole: string;
      advocateName: string | null;
      cnic: string | null;
      isPrimary: boolean;
    }>;
    customFields: Array<{
      id: string;
      fieldDefinition: { label: string; code: string; fieldType: string };
      valueText: string | null;
      valueNumber: number | null;
      valueBoolean: boolean | null;
      valueDate: Date | null;
    }>;
    assignments: Array<{
      id: string;
      roleInCase: string;
      user: { fullName: string; email: string; role: string };
      assignedAt: Date;
    }>;
    documents?: any[];
    hearings?: any[];
    tasks?: any[];
    caseFee?: any;
    payments?: any[];
    expenses?: any[];
    summaries?: any[];
    chatMessages?: any[];
    pendingEvents?: any[];
    generatedDocuments?: any[];
    templates?: any[];
    clientMessages?: any[];
    externalShares?: any[];
  };
  statuses: Array<{ id: string; code: string; label: string }>;
  canEdit: boolean;
  canApprove?: boolean;
}

export function CaseDetailView({ caseData, statuses, canEdit, canApprove = false }: CaseDetailViewProps) {
  const [activeTab, setActiveTab] = useState<
    "parties" | "documents" | "hearings" | "tasks" | "finance" | "ai" | "drafting" | "communications" | "fields" | "counsel"
  >("parties");
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const petitioners = caseData.parties.filter(
    (p) => p.partyRole === "PETITIONER" || p.partyRole === "PLAINTIFF" || p.partyRole === "APPELLANT"
  );
  const respondents = caseData.parties.filter(
    (p) => p.partyRole === "RESPONDENT" || p.partyRole === "DEFENDANT" || p.partyRole === "PROFORMA_RESPONDENT"
  );

  const documents = caseData.documents || [];
  const hearings = caseData.hearings || [];
  const tasks = caseData.tasks || [];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link
          href="/cases"
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-200 hover:text-white transition-all shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
          <span>&larr; Return to Case Directory</span>
        </Link>
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-500">Matter:</span>
          <span className="font-mono text-amber-400 font-bold bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
            {caseData.caseNumber}
          </span>
        </div>
      </div>

      {/* Case Header Card */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <span className="font-mono text-lg font-bold text-amber-400">
              {caseData.caseNumber}
            </span>
            <EthicalWallBadge isRestricted={caseData.isRestricted} />
          </div>

          <div className="flex items-center space-x-3">
            <StatusBadge status={caseData.status.code} showUrdu size="md" />

            {canEdit && (
              <button
                onClick={() => setIsStatusModalOpen(true)}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>Transition Status</span>
              </button>
            )}
          </div>
        </div>

        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">{caseData.title}</h1>
          <p className="text-xs text-slate-400 mt-1">
            {caseData.court} &bull; {caseData.caseType} &bull; {caseData.jurisdiction}
          </p>
        </div>

        {/* Quick Meta Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80 text-xs">
          <div>
            <span className="text-slate-500 block text-[11px]">Chambers Client</span>
            <span className="font-semibold text-white">{caseData.client.name}</span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px]">Primary Contact</span>
            <span className="font-semibold text-white">{caseData.client.mobile}</span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px]">Court / Bench</span>
            <span className="font-semibold text-white truncate block">
              {caseData.benchRef?.name || caseData.court}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px]">Institution Date</span>
            <span className="font-semibold text-white">
              {caseData.filingDate
                ? new Date(caseData.filingDate).toLocaleDateString("en-PK")
                : "Not recorded"}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation Pill Bar */}
      <div className="bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shadow-lg">
        <div className="flex space-x-1.5 text-xs overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 py-0.5">
          <button
            onClick={() => setActiveTab("parties")}
            className={`px-3.5 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "parties"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold"
                : "text-slate-300 hover:text-white hover:bg-slate-800/80"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Parties &amp; Counsel ({caseData.parties.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("documents")}
            className={`px-3.5 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "documents"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold"
                : "text-slate-300 hover:text-white hover:bg-slate-800/80"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Documents &amp; Briefs ({documents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("hearings")}
            className={`px-3.5 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "hearings"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold"
                : "text-slate-300 hover:text-white hover:bg-slate-800/80"
            }`}
          >
            <Gavel className="w-3.5 h-3.5" />
            <span>Hearings ({hearings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("tasks")}
            className={`px-3.5 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "tasks"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold"
                : "text-slate-300 hover:text-white hover:bg-slate-800/80"
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Tasks ({tasks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("finance")}
            className={`px-3.5 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "finance"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold"
                : "text-slate-300 hover:text-white hover:bg-slate-800/80"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Finance &amp; Expenses ({(caseData.payments || []).length})</span>
          </button>

          <button
            onClick={() => setActiveTab("ai")}
            className={`px-3.5 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "ai"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold"
                : "text-slate-300 hover:text-white hover:bg-slate-800/80"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Assistant &amp; OCR</span>
            {(caseData.pendingEvents || []).length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-amber-400 text-[10px] font-bold">
                {(caseData.pendingEvents || []).length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("drafting")}
            className={`px-3.5 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "drafting"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold"
                : "text-slate-300 hover:text-white hover:bg-slate-800/80"
            }`}
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Drafting &amp; Pleadings ({(caseData.generatedDocuments || []).length})</span>
          </button>

          <button
            onClick={() => setActiveTab("communications")}
            className={`px-3.5 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "communications"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold"
                : "text-slate-300 hover:text-white hover:bg-slate-800/80"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Client Comms ({(caseData.clientMessages || []).length + (caseData.externalShares || []).length})</span>
          </button>

          <button
            onClick={() => setActiveTab("fields")}
            className={`px-3.5 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "fields"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold"
                : "text-slate-300 hover:text-white hover:bg-slate-800/80"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Metadata ({caseData.customFields.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("counsel")}
            className={`px-3.5 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "counsel"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold"
                : "text-slate-300 hover:text-white hover:bg-slate-800/80"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Chambers Team ({caseData.assignments.length})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Parties */}
      {activeTab === "parties" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Petitioners / Plaintiffs */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Petitioners / Plaintiffs
            </h3>
            {petitioners.length === 0 ? (
              <p className="text-xs text-slate-500">No petitioners recorded.</p>
            ) : (
              petitioners.map((p) => (
                <div key={p.id} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{p.name}</span>
                    <span className="text-[10px] text-amber-400 font-mono">{p.partyRole}</span>
                  </div>
                  {p.cnic && <p className="text-[11px] text-slate-400">CNIC: {p.cnic}</p>}
                  {p.advocateName && (
                    <p className="text-[11px] text-slate-300">Counsel: {p.advocateName}</p>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Respondents / Defendants */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400">
              Respondents / Defendants / Opposing Counsel
            </h3>
            {respondents.length === 0 ? (
              <p className="text-xs text-slate-500">No respondents recorded.</p>
            ) : (
              respondents.map((p) => (
                <div key={p.id} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{p.name}</span>
                    <span className="text-[10px] text-rose-400 font-mono">{p.partyRole}</span>
                  </div>
                  {p.advocateName && (
                    <p className="text-[11px] text-slate-300">Opposing Counsel: {p.advocateName}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Documents */}
      {activeTab === "documents" && (
        <CaseDocumentsTab
          caseId={caseData.id}
          documents={documents}
          canEdit={canEdit}
        />
      )}

      {/* Tab 3: Hearings */}
      {activeTab === "hearings" && (
        <CaseHearingsTab
          caseId={caseData.id}
          defaultCourt={caseData.court}
          hearings={hearings}
          canEdit={canEdit}
        />
      )}

      {/* Tab 4: Tasks */}
      {activeTab === "tasks" && (
        <CaseTasksTab
          caseId={caseData.id}
          tasks={tasks}
          canEdit={canEdit}
        />
      )}

      {/* Tab 5: Custom Metadata */}
      {activeTab === "fields" && (
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Case Custom Field Attributes
          </h3>
          {caseData.customFields.length === 0 ? (
            <p className="text-xs text-slate-500">No custom field values recorded for this case.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {caseData.customFields.map((cf) => (
                <div key={cf.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-1">
                    {cf.fieldDefinition.label}
                  </span>
                  <span className="text-xs font-semibold text-white">
                    {cf.valueText ||
                      cf.valueNumber ||
                      (cf.valueBoolean !== null ? (cf.valueBoolean ? "Yes / Granted" : "No") : "") ||
                      (cf.valueDate ? new Date(cf.valueDate).toLocaleDateString("en-PK") : "—")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Chambers Team */}
      {activeTab === "counsel" && (
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Assigned Chambers Counsel &amp; Legal Staff
          </h3>
          <div className="space-y-3">
            {caseData.assignments.map((a) => (
              <div
                key={a.id}
                className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-semibold text-white">{a.user.fullName}</p>
                  <p className="text-[11px] text-slate-400">{a.user.email}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    {a.roleInCase}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Assigned: {new Date(a.assignedAt).toLocaleDateString("en-PK")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Finance & Expenses */}
      {activeTab === "finance" && (
        <CaseFinanceTab
          caseId={caseData.id}
          caseFee={caseData.caseFee}
          payments={caseData.payments || []}
          expenses={caseData.expenses || []}
          canEdit={canEdit}
        />
      )}

      {/* Tab 6: AI Assistant & Grounded Dossier */}
      {activeTab === "ai" && (
        <CaseAiAssistantTab
          caseId={caseData.id}
          caseNumber={caseData.caseNumber}
          summaries={caseData.summaries || []}
          messages={caseData.chatMessages || []}
          pendingEvents={caseData.pendingEvents || []}
          documents={caseData.documents || []}
          canEdit={canEdit}
        />
      )}

      {/* Tab 7: Drafting & Pleadings */}
      {activeTab === "drafting" && (
        <CaseDraftingTab
          caseId={caseData.id}
          caseData={caseData}
          templates={caseData.templates || []}
          generatedDocuments={caseData.generatedDocuments || []}
          uploadedDocuments={caseData.documents || []}
          canApprove={canApprove}
          canEdit={canEdit}
        />
      )}

      {/* Tab 8: Client Communications & Sharing */}
      {activeTab === "communications" && (
        <CaseCommunicationsTab
          caseId={caseData.id}
          client={caseData.client}
          clientMessages={caseData.clientMessages || []}
          externalShares={caseData.externalShares || []}
          documents={caseData.documents || []}
          canApprove={canApprove}
          canEdit={canEdit}
        />
      )}

      {/* Status Transition Modal */}
      <StatusTransitionModal
        caseId={caseData.id}
        currentStatusId={caseData.status.id}
        statuses={statuses}
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
      />
    </div>
  );
}
