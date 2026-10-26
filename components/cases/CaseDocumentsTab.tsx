"use client";

import React, { useState, useTransition } from "react";
import {
  FileText,
  Upload,
  Download,
  Lock,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  History,
  FileCode,
  FileSpreadsheet,
  File,
} from "lucide-react";
import {
  uploadDocumentAction,
  uploadRevisionAction,
  getDownloadTokenAction,
} from "@/lib/documents/actions";
import { DocumentCategory } from "@prisma/client";

interface DocumentItem {
  id: string;
  title: string;
  category: DocumentCategory;
  description: string | null;
  isRestricted: boolean;
  currentVersionNumber: number;
  createdAt: Date | string;
  versions: Array<{
    id: string;
    versionNumber: number;
    fileName: string;
    fileExtension: string;
    fileSizeBytes: string | number | bigint;
    createdAt: Date | string;
    notes: string | null;
    uploader: { fullName: string };
  }>;
}

interface CaseDocumentsTabProps {
  caseId: string;
  documents: DocumentItem[];
  canEdit: boolean;
}

export function CaseDocumentsTab({ caseId, documents, canEdit }: CaseDocumentsTabProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [revisionDoc, setRevisionDoc] = useState<DocumentItem | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDownload = async (docId: string, versionNumber?: number) => {
    startTransition(async () => {
      try {
        const res = await getDownloadTokenAction(docId, versionNumber);
        if (res.success) {
          window.open(res.downloadUrl, "_blank");
        } else {
          setMessage({ text: res.error || "Failed to download", type: "error" });
        }
      } catch (err: any) {
        setMessage({ text: err.message || "Download failed", type: "error" });
      }
    });
  };

  const handleUploadSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("caseId", caseId);

    startTransition(async () => {
      const res = await uploadDocumentAction(formData);
      if (res.success) {
        setMessage({ text: "Document uploaded successfully.", type: "success" });
        setIsUploadOpen(false);
      } else {
        setMessage({ text: res.error || "Upload failed", type: "error" });
      }
    });
  };

  const handleRevisionSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!revisionDoc) return;
    const formData = new FormData(e.currentTarget);
    formData.append("documentId", revisionDoc.id);
    formData.append("caseId", caseId);

    startTransition(async () => {
      const res = await uploadRevisionAction(formData);
      if (res.success) {
        setMessage({ text: "New revision uploaded successfully.", type: "success" });
        setRevisionDoc(null);
      } else {
        setMessage({ text: res.error || "Revision upload failed", type: "error" });
      }
    });
  };

  const formatFileSize = (bytes: string | number | bigint) => {
    const num = Number(bytes);
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Banner & Upload Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <span>Secure Case Documents & Filings</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Tamper-evident versioned storage, ClamAV malware scanning, and RLS ethical wall protection.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors shadow-lg shadow-amber-500/10 shrink-0"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        )}
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl border flex items-center space-x-2 text-xs ${message.type === "success"
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

      {/* Documents Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Case Files ({documents.length})
          </span>
          <span className="text-[11px] font-mono text-emerald-400">
            Private Storage &bull; Signed Download Links
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800/80 bg-slate-950/40">
                <th className="p-3.5 font-medium">Document Title & Category</th>
                <th className="p-3.5 font-medium">Latest Version</th>
                <th className="p-3.5 font-medium">File Details</th>
                <th className="p-3.5 font-medium">Security</th>
                <th className="p-3.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No documents uploaded yet for this litigation matter.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const latestVersion = doc.versions[0];
                  return (
                    <tr key={doc.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-start space-x-2.5">
                          <div className="p-2 rounded-lg bg-slate-800 text-amber-400 mt-0.5">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-white">{doc.title}</p>
                            <span className="inline-block mt-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {doc.category}
                            </span>
                            {doc.description && (
                              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                                {doc.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded font-mono font-bold bg-amber-400/10 text-amber-400 border border-amber-400/20">
                          <span>v{doc.currentVersionNumber}</span>
                        </span>
                        {doc.versions.length > 1 && (
                          <span className="block text-[10px] text-slate-500 mt-0.5">
                            {doc.versions.length} revisions preserved
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-slate-300">
                        {latestVersion && (
                          <div>
                            <p className="font-mono text-white text-[11px] truncate max-w-[180px]">
                              {latestVersion.fileName}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {formatFileSize(latestVersion.fileSizeBytes)} &bull; {latestVersion.uploader.fullName}
                            </p>
                          </div>
                        )}
                      </td>

                      <td className="p-3.5">
                        {doc.isRestricted ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                            <Lock className="w-3 h-3" />
                            <span>Restricted</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Standard</span>
                        )}
                      </td>

                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleDownload(doc.id, doc.currentVersionNumber)}
                          disabled={isPending}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors"
                          title="Download signed file"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>

                        {canEdit && (
                          <button
                            onClick={() => setRevisionDoc(doc)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs transition-colors"
                            title="Upload new version"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>New Version</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Document Modal */}
      {isUploadOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-amber-400" />
              <span>Upload Document to Case Dossier</span>
            </h3>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Document Title *
                </label>
                <input
                  name="title"
                  required
                  placeholder="e.g. Writ Petition Pleadings / Stay Application"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Category *
                  </label>
                  <select
                    name="category"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="COURT_ORDER">Court Order</option>
                    <option value="PLEADING">Pleading</option>
                    <option value="EVIDENCE">Evidence</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="CLIENT_DOC">Client Document</option>
                    <option value="POWER_OF_ATTORNEY">Wakalatnama / POA</option>
                    <option value="CORRESPONDENCE">Correspondence</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Per-Document Security
                  </label>
                  <label className="flex items-center space-x-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isRestricted"
                      value="true"
                      className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0"
                    />
                    <span className="text-xs text-slate-300">Restricted (Counsel only)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  File Attachment (PDF, DOCX, Images up to 25 MB) *
                </label>
                <input
                  type="file"
                  name="file"
                  required
                  accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.tiff"
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-amber-400 hover:file:bg-slate-700 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Version Notes / Filing Context
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Optional notes regarding this version..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>Upload & Scan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Revision Modal */}
      {revisionDoc && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-amber-400" />
              <span>Upload Revision for {revisionDoc.title}</span>
            </h3>
            <p className="text-xs text-slate-400">
              Current version is <strong className="text-amber-400">v{revisionDoc.currentVersionNumber}</strong>. Uploading will increment to <strong className="text-emerald-400">v{revisionDoc.currentVersionNumber + 1}</strong> and preserve previous versions.
            </p>

            <form onSubmit={handleRevisionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Replacement File (PDF, DOCX) *
                </label>
                <input
                  type="file"
                  name="file"
                  required
                  accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.tiff"
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-amber-400 hover:file:bg-slate-700 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Revision Reason / Amendments
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  required
                  placeholder="e.g. Incorporated amended schedule of property pursuant to LHC order..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRevisionDoc(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>Save New Version</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
