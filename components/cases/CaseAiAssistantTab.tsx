"use client";

import React, { useState, useTransition } from "react";
import {
  Sparkles,
  Send,
  Calendar,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  Shield,
  Layers,
  Search,
  BookOpen,
  ArrowRight,
  Info,
  Clock,
  Check,
} from "lucide-react";
import {
  generateCaseSummaryAction,
  sendCaseChatMessageAction,
  triggerDocumentOcrAction,
  extractEventsFromDocumentAction,
  reviewExtractedEventAction,
} from "@/lib/ai/actions";

interface SummaryItem {
  id: string;
  summaryType: string;
  content: string;
  model: string;
  confidenceScore: number | null;
  citations: any;
  createdAt: string | Date;
  generatedBy?: { fullName: string };
}

interface ChatMessageItem {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  citations?: any;
  createdAt: string | Date;
  user?: { fullName: string } | null;
}

interface ExtractedEventItem {
  id: string;
  eventType: "HEARING_DATE" | "FILING_DEADLINE" | "COMPLIANCE_TASK" | string;
  status: "PENDING_REVIEW" | "CONFIRMED" | "REJECTED";
  suggestedDate: string | Date;
  confidenceScore: number;
  sourceSnippet: string;
  documentVersionId: string;
  createdAt: string | Date;
}

interface DocumentVersionItem {
  id: string;
  versionNumber: number;
  fileName: string;
  document: { id: string; title: string };
  pages?: Array<{ id: string; pageNumber: number }>;
}

interface CaseAiAssistantTabProps {
  caseId: string;
  caseNumber: string;
  summaries: SummaryItem[];
  messages: ChatMessageItem[];
  pendingEvents: ExtractedEventItem[];
  documents: Array<{
    id: string;
    title: string;
    versions: Array<{
      id: string;
      versionNumber: number;
      fileName: string;
      pages?: Array<{ id: string; pageNumber: number }>;
    }>;
  }>;
  canEdit: boolean;
}

export function CaseAiAssistantTab({
  caseId,
  caseNumber,
  summaries: initialSummaries,
  messages: initialMessages,
  pendingEvents: initialPendingEvents,
  documents,
  canEdit,
}: CaseAiAssistantTabProps) {
  const [isPending, startTransition] = useTransition();
  const [summaries, setSummaries] = useState<SummaryItem[]>(initialSummaries);
  const [messages, setMessages] = useState<ChatMessageItem[]>(initialMessages);
  const [pendingEvents, setPendingEvents] = useState<ExtractedEventItem[]>(initialPendingEvents);

  const [activeSubTab, setActiveSubTab] = useState<"briefs" | "chat" | "queue" | "ocr">("briefs");
  const [summaryType, setSummaryType] = useState<string>("OVERVIEW");
  const [chatInput, setChatInput] = useState<string>("");
  const [selectedVersionId, setSelectedVersionId] = useState<string>(
    documents[0]?.versions[0]?.id || ""
  );
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Available document versions flattened for OCR selector
  const allDocVersions = documents.flatMap((doc) =>
    (doc.versions || []).map((v) => ({
      versionId: v.id,
      label: `${doc.title} (v${v.versionNumber} - ${v.fileName})`,
      pageCount: v.pages ? v.pages.length : 0,
    }))
  );

  const handleGenerateSummary = () => {
    setActionMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("caseId", caseId);
      formData.set("summaryType", summaryType);

      const res = await generateCaseSummaryAction(formData);
      if (res.success && res.summary) {
        setSummaries((prev) => [res.summary as any, ...prev]);
        setActionMessage({ text: "Dossier brief generated successfully with citations.", type: "success" });
      } else {
        setActionMessage({ text: res.error || "Failed to generate brief.", type: "error" });
      }
    });
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    setActionMessage(null);
    const query = chatInput.trim();
    setChatInput("");

    // Optimistic user message
    const tempUserMsg: ChatMessageItem = {
      id: "temp-" + Date.now(),
      role: "USER",
      content: query,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("caseId", caseId);
      formData.set("message", query);

      const res = await sendCaseChatMessageAction(formData);
      if (res.success && res.assistantMessage) {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMsg.id),
          res.userMessage as any,
          res.assistantMessage as any,
        ]);
      } else {
        setActionMessage({ text: res.error || "Assistant query failed.", type: "error" });
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      }
    });
  };

  const handleReviewEvent = (eventId: string, action: "CONFIRM" | "REJECT") => {
    setActionMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("eventId", eventId);
      formData.set("caseId", caseId);
      formData.set("action", action);

      const res = await reviewExtractedEventAction(formData);
      if (res.success) {
        setPendingEvents((prev) => prev.filter((ev) => ev.id !== eventId));
        setActionMessage({ text: res.message || `Event ${action.toLowerCase()}ed.`, type: "success" });
      } else {
        setActionMessage({ text: res.error || "Action failed.", type: "error" });
      }
    });
  };

  const handleRunOcr = () => {
    if (!selectedVersionId) return;
    setActionMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("versionId", selectedVersionId);
      formData.set("caseId", caseId);

      const res = await triggerDocumentOcrAction(formData);
      if (res.success) {
        setActionMessage({ text: res.message || "OCR completed.", type: "success" });
      } else {
        setActionMessage({ text: res.error || "OCR failed.", type: "error" });
      }
    });
  };

  const handleScanDates = () => {
    if (!selectedVersionId) return;
    setActionMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("versionId", selectedVersionId);
      formData.set("caseId", caseId);

      const res = await extractEventsFromDocumentAction(formData);
      if (res.success) {
        setActionMessage({ text: res.message || "Date extraction complete.", type: "success" });
        // Switch to review queue tab to view extracted items
        setActiveSubTab("queue");
      } else {
        setActionMessage({ text: res.error || "Date scan failed.", type: "error" });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Privacy Guarantee */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-indigo-500/10 border border-amber-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-slate-100">
                AI Document Assistant &amp; Grounded Dossier Analysis
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                xAI Grok Active
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Grounded legal document synthesis, Urdu/English page citations, and courtroom-grade case chat.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
          <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Zero External Training Data Leakage</span>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between ${
            actionMessage.type === "success"
              ? "bg-emerald-950/60 border border-emerald-800 text-emerald-300"
              : "bg-rose-950/60 border border-rose-800 text-rose-300"
          }`}
        >
          <div className="flex items-center space-x-2">
            {actionMessage.type === "success" ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-white ml-2"
          >
            &times;
          </button>
        </div>
      )}

      {/* Subtab Navigation */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          onClick={() => setActiveSubTab("briefs")}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center space-x-2 border-b-2 -mb-px transition-colors ${
            activeSubTab === "briefs"
              ? "border-amber-400 text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Case Briefs &amp; Summaries ({summaries.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("chat")}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center space-x-2 border-b-2 -mb-px transition-colors ${
            activeSubTab === "chat"
              ? "border-amber-400 text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Grounded Q&amp;A Chat ({messages.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("queue")}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center space-x-2 border-b-2 -mb-px transition-colors ${
            activeSubTab === "queue"
              ? "border-amber-400 text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>
            Confirmation Queue ({pendingEvents.length})
            {pendingEvents.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px]">
                {pendingEvents.length}
              </span>
            )}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab("ocr")}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center space-x-2 border-b-2 -mb-px transition-colors ${
            activeSubTab === "ocr"
              ? "border-amber-400 text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Document OCR &amp; Scanning</span>
        </button>
      </div>

      {/* 1. Case Briefs & Summaries Subtab */}
      {activeSubTab === "briefs" && (
        <div className="space-y-6">
          {/* Summary Generator Controls */}
          {canEdit && (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <span className="text-xs text-slate-400 font-medium">Brief Focus:</span>
                <select
                  value={summaryType}
                  onChange={(e) => setSummaryType(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-400"
                >
                  <option value="OVERVIEW">Comprehensive Overview</option>
                  <option value="LEGAL_ISSUES">Legal Issues &amp; Questions of Law</option>
                  <option value="PROCEDURAL_HISTORY">Procedural History &amp; Orders</option>
                  <option value="FACTUAL_BACKGROUND">Factual Background &amp; Evidence</option>
                </select>
              </div>

              <button
                onClick={handleGenerateSummary}
                disabled={isPending}
                className="w-full sm:w-auto px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold text-xs transition-all flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/10 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isPending ? "Analyzing Documents..." : "Generate Structured Brief"}</span>
              </button>
            </div>
          )}

          {/* Summaries List */}
          {summaries.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800">
              <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-300">No AI Briefs Generated Yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Generate an instant, grounded case dossier synthesizing petition averments, order sheets, and citations.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {summaries.map((s) => {
                const citations = Array.isArray(s.citations) ? s.citations : [];
                return (
                  <div
                    key={s.id}
                    className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/10 text-amber-400 border border-amber-400/20">
                          {s.summaryType.replace("_", " ")}
                        </span>
                        <span className="text-xs text-slate-400">
                          by {s.generatedBy?.fullName || "Chambers AI"}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-[11px] text-slate-500">
                        <span className="font-mono text-slate-400">model: {s.model}</span>
                        {s.confidenceScore && (
                          <span className="text-emerald-400 font-semibold">
                            Confidence: {Math.round(s.confidenceScore * 100)}%
                          </span>
                        )}
                        <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Brief Body */}
                    <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {s.content}
                    </div>

                    {/* Citations Footer */}
                    {citations.length > 0 && (
                      <div className="pt-3 border-t border-slate-800/80">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Grounded Document Citations ({citations.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {citations.map((c: any, idx: number) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-lg bg-slate-950 text-[11px] font-mono text-slate-300 border border-slate-800"
                            >
                              📄 {c.doc || "Document"} • Page {c.page || 1}
                              {c.quote && (
                                <span className="text-slate-500 block text-[10px] mt-0.5 italic">
                                  &ldquo;{c.quote.slice(0, 60)}...&rdquo;
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. Grounded Q&A Chat Subtab */}
      {activeSubTab === "chat" && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 flex flex-col h-[600px] overflow-hidden">
          {/* Chat Header */}
          <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-semibold text-slate-200">Matter Grounded Assistant</span>
              <span className="text-slate-500 font-mono">({caseNumber})</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Only indexed documents for this matter are accessed.
            </div>
          </div>

          {/* Chat Messages Scrollable Box */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <Search className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-xs font-semibold text-slate-300">Ask any question about this matter</p>
                <p className="text-[11px] text-slate-500 max-w-sm mt-1">
                  &ldquo;What is the maintainability objection raised by respondent?&rdquo; or &ldquo;What dates were given in previous orders?&rdquo;
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const isUser = m.role === "USER";
                const citations = Array.isArray(m.citations) ? m.citations : [];
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                  >
                    <div className="text-[10px] text-slate-500 mb-1 px-1">
                      {isUser ? m.user?.fullName || "Counsel" : "Assistant"} •{" "}
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                        isUser
                          ? "bg-amber-400 text-slate-950 font-medium"
                          : "bg-slate-950 border border-slate-800 text-slate-200"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{m.content}</div>

                      {/* Assistant citations */}
                      {!isUser && citations.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-800/80 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Sources:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {citations.map((c: any, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[10px] text-amber-300"
                              >
                                {c.doc || "Doc"}, P.{c.page || 1}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={handleSendChatMessage}
            className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center space-x-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask a question about petitions, exhibits, or orders..."
              disabled={isPending}
              className="flex-1 bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              disabled={isPending || !chatInput.trim()}
              className="p-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* 3. Confirmation Review Queue Subtab */}
      {activeSubTab === "queue" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start space-x-3">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Human-in-the-Loop Confirmation Guarantee:</span>
              <p className="text-amber-200/80 mt-0.5">
                AI scans extract potential court dates and deadlines into this pending queue. No hearing or task is ever scheduled without your explicit one-click confirmation.
              </p>
            </div>
          </div>

          {pendingEvents.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800">
              <CheckCircle2 className="w-10 h-10 text-emerald-500/60 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-300">Review Queue Clear</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No unconfirmed extracted dates pending. Run date scanning on newly uploaded documents in the &ldquo;Document OCR &amp; Scanning&rdquo; tab.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center space-x-2.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          ev.eventType === "HEARING_DATE"
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                            : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        }`}
                      >
                        {ev.eventType === "HEARING_DATE" ? "Court Hearing Date" : "Filing Deadline"}
                      </span>
                      <span className="text-xs text-slate-400">
                        Confidence:{" "}
                        <strong className="text-emerald-400">
                          {Math.round(ev.confidenceScore * 100)}%
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-sm font-bold text-slate-100">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Suggested Date: {new Date(ev.suggestedDate).toDateString()}</span>
                    </div>

                    <div className="text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 text-slate-300 italic">
                      &ldquo;{ev.sourceSnippet}&rdquo;
                    </div>
                  </div>

                  {canEdit && (
                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => handleReviewEvent(ev.id, "CONFIRM")}
                        disabled={isPending}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm &amp; Schedule</span>
                      </button>

                      <button
                        onClick={() => handleReviewEvent(ev.id, "REJECT")}
                        disabled={isPending}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 font-semibold text-xs flex items-center space-x-1.5 transition-colors border border-slate-700 disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Document OCR & Scanning Subtab */}
      {activeSubTab === "ocr" && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>OCR Text Extraction &amp; Multilingual Date Scanner</span>
            </h3>
            <p className="text-xs text-slate-400">
              Extract page-by-page text from petitions, affidavits, and court orders. Supports Urdu Nastaliq script detection and extracts legal hearing dates directly into your confirmation queue.
            </p>

            {allDocVersions.length === 0 ? (
              <div className="text-xs text-slate-500 p-4 bg-slate-950 rounded-xl">
                No documents uploaded for this case. Upload a PDF in the &ldquo;Documents &amp; Briefs&rdquo; tab first.
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Select Document Version to Process:
                  </label>
                  <select
                    value={selectedVersionId}
                    onChange={(e) => setSelectedVersionId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                  >
                    {allDocVersions.map((v) => (
                      <option key={v.versionId} value={v.versionId}>
                        {v.label} {v.pageCount > 0 ? `(${v.pageCount} pages indexed)` : "(Not yet OCR indexed)"}
                      </option>
                    ))}
                  </select>
                </div>

                {canEdit && (
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleRunOcr}
                      disabled={isPending || !selectedVersionId}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs border border-slate-700 flex items-center space-x-2 transition-colors disabled:opacity-50"
                    >
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isPending ? "Extracting Text..." : "Run Page OCR Pipeline"}</span>
                    </button>

                    <button
                      onClick={handleScanDates}
                      disabled={isPending || !selectedVersionId}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs flex items-center space-x-2 shadow-lg shadow-amber-500/10 transition-all disabled:opacity-50"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{isPending ? "Scanning Dates..." : "Extract Dates &amp; Deadlines"}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
