"use client";

import React, { useState, useTransition } from "react";
import {
  MessageSquare,
  Share2,
  Lock,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Mail,
  Phone,
  Shield,
  FileCheck,
  Check,
  Clock,
} from "lucide-react";
import {
  createClientMessageAction,
  submitClientMessageForApprovalAction,
  reviewClientMessageAction,
  dispatchApprovedClientMessageAction,
  createExternalDocumentShareAction,
  reviewExternalDocumentShareAction,
  dispatchApprovedExternalShareAction,
} from "@/lib/communication/actions";

interface ClientMessageItem {
  id: string;
  channel: "EMAIL" | "WHATSAPP" | "SMS";
  recipient: string;
  subject: string | null;
  content: string;
  messageType: string;
  approvalStatus: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "SENT" | "FAILED";
  approvedAt: string | Date | null;
  rejectionReason: string | null;
  sentAt: string | Date | null;
  deliveryStatus: string | null;
  createdAt: string | Date;
}

interface ExternalShareItem {
  id: string;
  recipientEmail: string;
  subject: string;
  message: string;
  isPasswordProtected: boolean;
  passwordDeliveryMethod: "WHATSAPP" | "SMS" | "MANUAL";
  deliveryRecipientContact: string | null;
  approvalStatus: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "SENT";
  approvedAt: string | Date | null;
  rejectionReason: string | null;
  sentAt: string | Date | null;
  items: Array<{
    documentVersion: {
      fileName: string;
      document: { title: string };
    };
  }>;
  createdAt: string | Date;
}

interface CaseCommunicationsTabProps {
  caseId: string;
  client: { id: string; name: string; mobile: string; email: string | null };
  clientMessages: ClientMessageItem[];
  externalShares: ExternalShareItem[];
  documents: Array<{
    id: string;
    title: string;
    versions: Array<{ id: string; versionNumber: number; fileName: string }>;
  }>;
  canApprove: boolean;
  canEdit: boolean;
}

export function CaseCommunicationsTab({
  caseId,
  client,
  clientMessages: initialMessages,
  externalShares: initialShares,
  documents,
  canApprove,
  canEdit,
}: CaseCommunicationsTabProps) {
  const [isPending, startTransition] = useTransition();
  const [activeSubTab, setActiveSubTab] = useState<"messages" | "shares">("messages");

  const [messages, setMessages] = useState<ClientMessageItem[]>(initialMessages);
  const [shares, setShares] = useState<ExternalShareItem[]>(initialShares);

  // New Client Message Form State
  const [isCreatingMsg, setIsCreatingMsg] = useState(false);
  const [msgChannel, setMsgChannel] = useState<"EMAIL" | "WHATSAPP" | "SMS">("EMAIL");
  const [msgRecipient, setMsgRecipient] = useState(client.email || client.mobile);
  const [msgSubject, setMsgSubject] = useState("Update Regarding Your Case Proceedings");
  const [msgContent, setMsgContent] = useState("");
  const [msgType, setMsgType] = useState("HEARING_UPDATE");

  // New External Share Form State
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareSubject, setShareSubject] = useState(`Litigation Documents - Case ${caseId.slice(0, 8)}`);
  const [shareMessage, setShareMessage] = useState(
    "Please find attached the court documents requested for your review. Protected attachments will require the passcode delivered to your mobile contact."
  );
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [passwordDeliveryMethod, setPasswordDeliveryMethod] = useState<"WHATSAPP" | "SMS" | "MANUAL">("WHATSAPP");
  const [deliveryContact, setDeliveryContact] = useState(client.mobile);

  const [notice, setNotice] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Available document versions flattened
  const allDocVersions = documents.flatMap((d) =>
    (d.versions || []).map((v) => ({
      versionId: v.id,
      label: `${d.title} (v${v.versionNumber} - ${v.fileName})`,
    }))
  );

  const handleCreateMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgRecipient || !msgContent.trim()) return;

    setNotice(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("caseId", caseId);
      formData.set("clientId", client.id);
      formData.set("channel", msgChannel);
      formData.set("recipient", msgRecipient.trim());
      formData.set("subject", msgSubject.trim());
      formData.set("content", msgContent.trim());
      formData.set("messageType", msgType);

      const res = await createClientMessageAction(formData);
      if (res.success && res.message) {
        setMessages((prev) => [res.message as any, ...prev]);
        setIsCreatingMsg(false);
        setMsgContent("");
        setNotice({ text: "Client message draft created.", type: "success" });
      } else {
        setNotice({ text: res.error || "Failed to create message.", type: "error" });
      }
    });
  };

  const handleReviewMessage = (messageId: string, action: "APPROVE" | "REJECT") => {
    setNotice(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("messageId", messageId);
      formData.set("caseId", caseId);
      formData.set("action", action);

      const res = await reviewClientMessageAction(formData);
      if (res.success && res.message) {
        setMessages((prev) => prev.map((m) => (m.id === messageId ? (res.message as any) : m)));
        setNotice({ text: res.notice || "Message review updated.", type: "success" });
      } else {
        setNotice({ text: res.error || "Review failed.", type: "error" });
      }
    });
  };

  const handleDispatchMessage = (messageId: string) => {
    setNotice(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("messageId", messageId);
      formData.set("caseId", caseId);

      const res = await dispatchApprovedClientMessageAction(formData);
      if (res.success && res.message) {
        setMessages((prev) => prev.map((m) => (m.id === messageId ? (res.message as any) : m)));
        setNotice({ text: res.notice || "Message dispatched.", type: "success" });
      } else {
        setNotice({ text: res.error || "Dispatch failed.", type: "error" });
      }
    });
  };

  const handleCreateShare = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareEmail.trim() || selectedVersions.length === 0) return;

    setNotice(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("caseId", caseId);
      formData.set("recipientEmail", shareEmail.trim());
      formData.set("subject", shareSubject.trim());
      formData.set("message", shareMessage.trim());
      formData.set("isPasswordProtected", "true");
      formData.set("passwordDeliveryMethod", passwordDeliveryMethod);
      formData.set("deliveryRecipientContact", deliveryContact.trim());
      selectedVersions.forEach((vId) => formData.append("documentVersionIds", vId));

      const res = await createExternalDocumentShareAction(formData);
      if (res.success && res.share) {
        setShares((prev) => [res.share as any, ...prev]);
        setIsCreatingShare(false);
        setSelectedVersions([]);
        setNotice({ text: "External share request created.", type: "success" });
      } else {
        setNotice({ text: res.error || "Failed to create share.", type: "error" });
      }
    });
  };

  const handleReviewShare = (shareId: string, action: "APPROVE" | "REJECT") => {
    setNotice(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("shareId", shareId);
      formData.set("caseId", caseId);
      formData.set("action", action);

      const res = await reviewExternalDocumentShareAction(formData);
      if (res.success && res.share) {
        setShares((prev) => prev.map((s) => (s.id === shareId ? (res.share as any) : s)));
        setNotice({ text: res.notice || "Share review updated.", type: "success" });
      } else {
        setNotice({ text: res.error || "Review failed.", type: "error" });
      }
    });
  };

  const handleDispatchShare = (shareId: string) => {
    setNotice(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("shareId", shareId);
      formData.set("caseId", caseId);

      const res = await dispatchApprovedExternalShareAction(formData);
      if (res.success && res.share) {
        setShares((prev) => prev.map((s) => (s.id === shareId ? (res.share as any) : s)));
        setNotice({ text: res.notice || "External share dispatched.", type: "success" });
      } else {
        setNotice({ text: res.error || "Dispatch failed.", type: "error" });
      }
    });
  };

  const toggleVersionSelection = (versionId: string) => {
    setSelectedVersions((prev) =>
      prev.includes(versionId) ? prev.filter((id) => id !== versionId) : [...prev, versionId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Notice Alert */}
      {notice && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between ${
            notice.type === "success"
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

      {/* Security Banner: Clients have no portal */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-indigo-500/10 border border-amber-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-slate-100">
                Client Communications &amp; Approval-Gated Sharing
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Approval Required
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Clients have strictly no portal login. Every client message and external attachment requires explicit lawyer approval.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
          <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-slate-300">Dual-Channel Passcode Delivery</span>
        </div>
      </div>

      {/* Subtab Navigation */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          onClick={() => setActiveSubTab("messages")}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center space-x-2 border-b-2 -mb-px transition-colors ${
            activeSubTab === "messages"
              ? "border-amber-400 text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Client Messages ({messages.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("shares")}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center space-x-2 border-b-2 -mb-px transition-colors ${
            activeSubTab === "shares"
              ? "border-amber-400 text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>External Document Shares ({shares.length})</span>
        </button>
      </div>

      {/* 1. Client Messages Subtab */}
      {activeSubTab === "messages" && (
        <div className="space-y-6">
          {canEdit && (
            <div className="flex justify-end">
              <button
                onClick={() => setIsCreatingMsg(!isCreatingMsg)}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-lg shadow-amber-500/10"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{isCreatingMsg ? "Cancel Draft" : "Draft Client Message"}</span>
              </button>
            </div>
          )}

          {/* New Message Form */}
          {isCreatingMsg && (
            <form
              onSubmit={handleCreateMessage}
              className="p-5 rounded-2xl bg-slate-900 border border-amber-500/30 shadow-xl space-y-4"
            >
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Draft New Client Communication
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Channel:</label>
                  <select
                    value={msgChannel}
                    onChange={(e) => {
                      const ch = e.target.value as any;
                      setMsgChannel(ch);
                      setMsgRecipient(ch === "EMAIL" ? client.email || "" : client.mobile);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                  >
                    <option value="EMAIL">Email</option>
                    <option value="WHATSAPP">WhatsApp Business</option>
                    <option value="SMS">SMS Gateway</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Recipient:</label>
                  <input
                    type="text"
                    value={msgRecipient}
                    onChange={(e) => setMsgRecipient(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Message Purpose:</label>
                  <select
                    value={msgType}
                    onChange={(e) => setMsgType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                  >
                    <option value="HEARING_UPDATE">Hearing Date &amp; Notice Update</option>
                    <option value="CASE_OUTCOME">Court Proceeding Outcome</option>
                    <option value="FEE_REMINDER">Fee &amp; Payment Statement</option>
                    <option value="APPOINTMENT">Chambers Appointment</option>
                  </select>
                </div>
              </div>

              {msgChannel === "EMAIL" && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Subject:</label>
                  <input
                    type="text"
                    value={msgSubject}
                    onChange={(e) => setMsgSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Message Body (Plain, lawyer-verified language):
                </label>
                <textarea
                  rows={5}
                  value={msgContent}
                  onChange={(e) => setMsgContent(e.target.value)}
                  placeholder="e.g. Dear Client, This is to inform you that your constitutional petition has been adjourned to 28th November 2026 for hearing on interim stay..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreatingMsg(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Save Draft"}
                </button>
              </div>
            </form>
          )}

          {/* Messages List */}
          {messages.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 text-xs">
              <Mail className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <span>No client communications drafted for this case yet.</span>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center space-x-2.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {m.channel}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          m.approvalStatus === "APPROVED"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : m.approvalStatus === "SENT"
                            ? "bg-teal-500/10 text-teal-300 border-teal-500/20"
                            : m.approvalStatus === "REJECTED"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {m.approvalStatus}
                      </span>
                      <span className="text-xs text-slate-400">To: {m.recipient}</span>
                    </div>

                    {m.subject && (
                      <h4 className="text-xs font-bold text-slate-100">{m.subject}</h4>
                    )}

                    <div className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 whitespace-pre-wrap font-sans">
                      {m.content}
                    </div>

                    {m.sentAt && (
                      <div className="text-[10px] text-slate-500">
                        Dispatched: {new Date(m.sentAt).toLocaleString("en-PK")}
                      </div>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center space-x-2 shrink-0">
                    {m.approvalStatus === "DRAFT" && canApprove && (
                      <button
                        onClick={() => handleReviewMessage(m.id, "APPROVE")}
                        disabled={isPending}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center space-x-1 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    )}

                    {m.approvalStatus === "APPROVED" && (
                      <button
                        onClick={() => handleDispatchMessage(m.id)}
                        disabled={isPending}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition-all disabled:opacity-50 shadow-md"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send to Client</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. External Document Shares Subtab */}
      {activeSubTab === "shares" && (
        <div className="space-y-6">
          {canEdit && (
            <div className="flex justify-end">
              <button
                onClick={() => setIsCreatingShare(!isCreatingShare)}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-lg shadow-amber-500/10"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{isCreatingShare ? "Cancel Share" : "Prepare External Share"}</span>
              </button>
            </div>
          )}

          {/* New External Share Form */}
          {isCreatingShare && (
            <form
              onSubmit={handleCreateShare}
              className="p-5 rounded-2xl bg-slate-900 border border-amber-500/30 shadow-xl space-y-4"
            >
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Prepare Secure External Attachment Share
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Recipient Email:
                  </label>
                  <input
                    type="email"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder="advocate.opposing@firm.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Email Subject:
                  </label>
                  <input
                    type="text"
                    value={shareSubject}
                    onChange={(e) => setShareSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Document Version Selectors */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Select Document Attachments to Include:
                </label>
                {allDocVersions.length === 0 ? (
                  <div className="text-xs text-slate-500 p-3 bg-slate-950 rounded-xl">
                    No documents uploaded in this matter.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800 max-h-48 overflow-y-auto">
                    {allDocVersions.map((v) => {
                      const isSelected = selectedVersions.includes(v.versionId);
                      return (
                        <div
                          key={v.versionId}
                          onClick={() => toggleVersionSelection(v.versionId)}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center space-x-2 ${
                            isSelected
                              ? "bg-amber-400/10 border-amber-400 text-amber-200"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="rounded border-slate-700 text-amber-400 focus:ring-0"
                          />
                          <span className="line-clamp-1">{v.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Password Protection & Dual-Channel Rules */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Dual-Channel Passcode Delivery Guarantee</span>
                </div>
                <p className="text-xs text-slate-400">
                  Per security rules, attachment encryption passcodes are never placed in the email body.
                  Select the independent channel for password delivery:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Password Delivery Channel:
                    </label>
                    <select
                      value={passwordDeliveryMethod}
                      onChange={(e) => setPasswordDeliveryMethod(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                    >
                      <option value="WHATSAPP">WhatsApp (Official Number)</option>
                      <option value="SMS">SMS Gateway</option>
                      <option value="MANUAL">Manual Delivery (Recorded in Audit)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Secondary Channel Contact (Mobile/Phone):
                    </label>
                    <input
                      type="text"
                      value={deliveryContact}
                      onChange={(e) => setDeliveryContact(e.target.value)}
                      placeholder="+92 300 1234567"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Email Message Body:
                </label>
                <textarea
                  rows={4}
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreatingShare(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || selectedVersions.length === 0}
                  className="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs disabled:opacity-50"
                >
                  {isPending ? "Preparing..." : "Submit Share for Approval"}
                </button>
              </div>
            </form>
          )}

          {/* External Shares List */}
          {shares.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 text-xs">
              <Share2 className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <span>No external document shares prepared yet.</span>
            </div>
          ) : (
            <div className="space-y-4">
              {shares.map((s) => (
                <div
                  key={s.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center space-x-2.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center space-x-1">
                        <Lock className="w-3 h-3 text-amber-400" />
                        <span>{s.passwordDeliveryMethod} Password Delivery</span>
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          s.approvalStatus === "APPROVED"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : s.approvalStatus === "SENT"
                            ? "bg-teal-500/10 text-teal-300 border-teal-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {s.approvalStatus}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-100">
                      To: {s.recipientEmail} • Subject: &ldquo;{s.subject}&rdquo;
                    </h4>

                    {/* Attached files */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(s.items || []).map((it, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300"
                        >
                          📎 {it.documentVersion?.document?.title || "Document"} (
                          {it.documentVersion?.fileName || "file"})
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center space-x-2 shrink-0">
                    {s.approvalStatus === "DRAFT" && canApprove && (
                      <button
                        onClick={() => handleReviewShare(s.id, "APPROVE")}
                        disabled={isPending}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center space-x-1 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve Share</span>
                      </button>
                    )}

                    {s.approvalStatus === "APPROVED" && (
                      <button
                        onClick={() => handleDispatchShare(s.id)}
                        disabled={isPending}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition-all disabled:opacity-50 shadow-md"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Dispatch Email &amp; Password</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
