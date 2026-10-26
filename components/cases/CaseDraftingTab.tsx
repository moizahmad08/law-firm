"use client";

import React, { useState, useTransition } from "react";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Download,
  Upload,
  Send,
  AlertTriangle,
  Sparkles,
  Layers,
  Clock,
  Edit3,
  Check,
} from "lucide-react";
import {
  createGeneratedDocumentAction,
  updateGeneratedDocumentAction,
  submitDocumentForApprovalAction,
  reviewDocumentApprovalAction,
  exportDocumentForSigningAction,
  linkSignedDocumentCopyAction,
} from "@/lib/drafting/actions";
import { autofillTemplateContent } from "@/lib/drafting/service";

interface TemplateItem {
  id: string;
  name: string;
  code: string;
  category: string;
  description: string | null;
  versions: Array<{ versionNumber: number; content: string }>;
}

interface GeneratedDocItem {
  id: string;
  title: string;
  content: string;
  approvalStatus: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "EXPORTED_FOR_SIGNING" | "SIGNED_COPY_UPLOADED" | "REJECTED" | "SUPERSEDED";
  templateVersionNumber: number | null;
  approvedAt: string | Date | null;
  rejectionReason: string | null;
  exportedAt: string | Date | null;
  exportFormat: string | null;
  signedDocumentId: string | null;
  createdAt: string | Date;
}

interface CaseDraftingTabProps {
  caseId: string;
  caseData: any;
  templates: TemplateItem[];
  generatedDocuments: GeneratedDocItem[];
  uploadedDocuments: Array<{ id: string; title: string }>;
  canApprove: boolean;
  canEdit: boolean;
}

export function CaseDraftingTab({
  caseId,
  caseData,
  templates,
  generatedDocuments: initialDocs,
  uploadedDocuments,
  canApprove,
  canEdit,
}: CaseDraftingTabProps) {
  const [isPending, startTransition] = useTransition();
  const [documents, setDocuments] = useState<GeneratedDocItem[]>(initialDocs);
  const [selectedDoc, setSelectedDoc] = useState<GeneratedDocItem | null>(initialDocs[0] || null);

  // Drafting / Template Modal State
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || "");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [missingTokens, setMissingTokens] = useState<string[]>([]);

  // Editing state for active document
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [notice, setNotice] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl && tmpl.versions[0]) {
      const autofill = autofillTemplateContent(tmpl.versions[0].content, caseData);
      setDraftTitle(`${tmpl.name} - ${caseData.caseNumber}`);
      setDraftContent(autofill.renderedContent);
      setMissingTokens(autofill.missingTokens);
    }
  };

  const handleSaveNewDraft = () => {
    if (!draftTitle.trim() || !draftContent.trim()) return;
    setNotice(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("caseId", caseId);
      formData.set("templateId", selectedTemplateId);
      formData.set("title", draftTitle.trim());
      formData.set("content", draftContent);

      const res = await createGeneratedDocumentAction(formData);
      if (res.success && res.document) {
        setDocuments((prev) => [res.document as any, ...prev]);
        setSelectedDoc(res.document as any);
        setIsCreatingDraft(false);
        setNotice({ text: "Document draft created.", type: "success" });
      } else {
        setNotice({ text: res.error || "Failed to create draft.", type: "error" });
      }
    });
  };

  const handleUpdateContent = () => {
    if (!selectedDoc) return;
    setNotice(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("documentId", selectedDoc.id);
      formData.set("caseId", caseId);
      formData.set("content", editContent);

      const res = await updateGeneratedDocumentAction(formData);
      if (res.success && res.document) {
        setDocuments((prev) => prev.map((d) => (d.id === res.document.id ? (res.document as any) : d)));
        setSelectedDoc(res.document as any);
        setIsEditing(false);
        setNotice({ text: res.message || "Document updated.", type: "success" });
      } else {
        setNotice({ text: res.error || "Update failed.", type: "error" });
      }
    });
  };

  const handleSubmitApproval = (docId: string) => {
    setNotice(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("documentId", docId);
      formData.set("caseId", caseId);

      const res = await submitDocumentForApprovalAction(formData);
      if (res.success && res.document) {
        setDocuments((prev) => prev.map((d) => (d.id === docId ? (res.document as any) : d)));
        if (selectedDoc?.id === docId) setSelectedDoc(res.document as any);
        setNotice({ text: "Submitted for partner review.", type: "success" });
      } else {
        setNotice({ text: res.error || "Submission failed.", type: "error" });
      }
    });
  };

  const handleReview = (docId: string, action: "APPROVE" | "REJECT") => {
    setNotice(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("documentId", docId);
      formData.set("caseId", caseId);
      formData.set("action", action);

      const res = await reviewDocumentApprovalAction(formData);
      if (res.success && res.document) {
        setDocuments((prev) => prev.map((d) => (d.id === docId ? (res.document as any) : d)));
        if (selectedDoc?.id === docId) setSelectedDoc(res.document as any);
        setNotice({ text: res.message || "Document review updated.", type: "success" });
      } else {
        setNotice({ text: res.error || "Review action failed.", type: "error" });
      }
    });
  };

  const handleExport = (docId: string) => {
    setNotice(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("documentId", docId);
      formData.set("caseId", caseId);
      formData.set("format", "PDF");

      const res = await exportDocumentForSigningAction(formData);
      if (res.success && res.document) {
        setDocuments((prev) => prev.map((d) => (d.id === docId ? (res.document as any) : d)));
        if (selectedDoc?.id === docId) setSelectedDoc(res.document as any);
        setNotice({ text: "Document marked exported for signing.", type: "success" });
      } else {
        setNotice({ text: res.error || "Export failed.", type: "error" });
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "PENDING_APPROVAL":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "EXPORTED_FOR_SIGNING":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "SIGNED_COPY_UPLOADED":
        return "bg-teal-500/10 text-teal-300 border-teal-500/20";
      case "REJECTED":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Notice Banner */}
      {notice && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between ${notice.type === "success"
              ? "bg-emerald-950/60 border border-emerald-800 text-emerald-300"
              : "bg-rose-950/60 border border-rose-800 text-rose-300"
            }`}
        >
          <div className="flex items-center space-x-2">
            {notice.type === "success" ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{notice.text}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Document Drafting &amp; Approval Governance</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Autofill pleadings, applications, and notices with strict post-approval edit invalidation.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => {
              setIsCreatingDraft(true);
              if (templates.length > 0) handleSelectTemplate(templates[0].id);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-amber-500/10 transition-all shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Draft from Template</span>
          </button>
        )}
      </div>

      {/* Template Drafting Modal */}
      {isCreatingDraft && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-amber-500/30 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-sm font-bold text-slate-200">New Document Draft from Template</h4>
            <button
              onClick={() => setIsCreatingDraft(false)}
              className="text-slate-400 hover:text-white text-sm"
            >
              &times;
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Select Template:
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.category.replace("_", " ")})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Draft Title:
              </label>
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {missingTokens.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Unresolved Case Tokens Flagged:</span>
                <p className="text-amber-200/80 mt-0.5">
                  Missing: {missingTokens.join(", ")}. Please review draft before submitting.
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Draft Content:
            </label>
            <textarea
              rows={12}
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl p-3 font-mono focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
            <button
              onClick={() => setIsCreatingDraft(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveNewDraft}
              disabled={isPending}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-bold transition-colors disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Save Draft"}
            </button>
          </div>
        </div>
      )}

      {/* Main Drafting Section: Document List & Document Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Document List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Case Generated Drafts ({documents.length})
          </div>

          {documents.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 text-xs">
              <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <span>No generated documents yet. Click &ldquo;Draft from Template&rdquo; above.</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {documents.map((doc) => {
                const isSelected = selectedDoc?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => {
                      setSelectedDoc(doc);
                      setIsEditing(false);
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${isSelected
                        ? "bg-slate-800 border-amber-400 shadow-md"
                        : "bg-slate-900 border-slate-800 hover:border-slate-700"
                      }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-semibold text-xs text-slate-200 line-clamp-1">
                        {doc.title}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                          doc.approvalStatus
                        )}`}
                      >
                        {doc.approvalStatus.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500">
                      Created: {new Date(doc.createdAt).toLocaleDateString("en-PK")}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Document Details & Workflow Actions */}
        <div className="lg:col-span-8">
          {selectedDoc ? (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{selectedDoc.title}</h3>
                  <div className="flex items-center space-x-2 text-xs text-slate-400 mt-1">
                    <span>Status:</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                        selectedDoc.approvalStatus
                      )}`}
                    >
                      {selectedDoc.approvalStatus.replace(/_/g, " ")}
                    </span>
                    {selectedDoc.approvedAt && (
                      <span className="text-emerald-400">
                        • Approved {new Date(selectedDoc.approvedAt).toLocaleDateString("en-PK")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Workflow Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {selectedDoc.approvalStatus === "DRAFT" && canEdit && (
                    <button
                      onClick={() => handleSubmitApproval(selectedDoc.id)}
                      disabled={isPending}
                      className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit for Approval</span>
                    </button>
                  )}

                  {selectedDoc.approvalStatus === "PENDING_APPROVAL" && canApprove && (
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleReview(selectedDoc.id, "APPROVE")}
                        disabled={isPending}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center space-x-1 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleReview(selectedDoc.id, "REJECT")}
                        disabled={isPending}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 font-semibold text-xs flex items-center space-x-1 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}

                  {selectedDoc.approvalStatus === "APPROVED" && (
                    <button
                      onClick={() => handleExport(selectedDoc.id)}
                      disabled={isPending}
                      className="px-3 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export for Signing</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Substantive edit alert for approved documents */}
              {selectedDoc.approvalStatus === "APPROVED" && isEditing && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Strict Approval Invalidation Notice:</span>
                    <p className="text-amber-200/80 mt-0.5">
                      Substantive edits to this approved document will automatically reset its status to DRAFT, requiring renewed review before export.
                    </p>
                  </div>
                </div>
              )}

              {/* Document Content View / Editor */}
              {isEditing ? (
                <div className="space-y-3">
                  <textarea
                    rows={16}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-400"
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateContent}
                      disabled={isPending}
                      className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs disabled:opacity-50"
                    >
                      {isPending ? "Updating..." : "Save Modifications"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Document Body:</span>
                    {canEdit && (
                      <button
                        onClick={() => {
                          setEditContent(selectedDoc.content);
                          setIsEditing(true);
                        }}
                        className="text-amber-400 hover:text-amber-300 font-semibold flex items-center space-x-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Text</span>
                      </button>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
                    {selectedDoc.content}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 text-xs">
              Select a generated document to view content, submit for partner approval, or export for signing.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
