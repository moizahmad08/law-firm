"use client";

import React, { useState } from "react";
import {
  DollarSign,
  PlusCircle,
  RotateCcw,
  Receipt,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  ArrowDownCircle,
  FileText,
} from "lucide-react";
import {
  createCaseFeeAction,
  recordPaymentAction,
  reversePaymentAction,
  recordExpenseAction,
  updateExpenseStatusAction,
  exportFinancialReportAction,
} from "@/lib/finance/actions";

interface CaseFinanceTabProps {
  caseId: string;
  caseFee?: {
    id: string;
    agreedFee: any;
    currency: string;
    notes: string | null;
    installments: Array<{
      id: string;
      installmentNumber: number;
      amount: any;
      dueDate: Date | string;
      status: string;
      paidAt: Date | string | null;
    }>;
  } | null;
  payments: Array<{
    id: string;
    receiptNumber: string;
    amount: any;
    paymentMethod: string;
    paymentDate: Date | string;
    referenceNumber: string | null;
    notes: string | null;
    isReversed: boolean;
    reversalReason: string | null;
    reversedAt: Date | string | null;
    receivedBy: { fullName: string };
    reversedBy?: { fullName: string } | null;
  }>;
  expenses: Array<{
    id: string;
    category: string;
    amount: any;
    expenseDate: Date | string;
    isBillableToClient: boolean;
    paymentStatus: string;
    notes: string | null;
    incurredBy: { fullName: string };
  }>;
  canEdit: boolean;
}

export function CaseFinanceTab({
  caseId,
  caseFee,
  payments = [],
  expenses = [],
  canEdit,
}: CaseFinanceTabProps) {
  // Modals state
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [reversalPayment, setReversalPayment] = useState<any | null>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fee agreement form state
  const [feeAmount, setFeeAmount] = useState("");
  const [feeNotes, setFeeNotes] = useState("");
  const [installments, setInstallments] = useState<Array<{ amount: string; dueDate: string }>>([
    { amount: "", dueDate: "" },
  ]);

  // Payment form state
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("BANK_TRANSFER");
  const [payRef, setPayRef] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payNotes, setPayNotes] = useState("");
  const [payInstallmentId, setPayInstallmentId] = useState("");

  // Expense form state
  const [expCategory, setExpCategory] = useState("COURT_FEE");
  const [expAmount, setExpAmount] = useState("");
  const [expDate, setExpDate] = useState(new Date().toISOString().split("T")[0]);
  const [expBillable, setExpBillable] = useState(true);
  const [expNotes, setExpNotes] = useState("");

  // Reversal form state
  const [reversalReason, setReversalReason] = useState("");

  // Calculations
  const agreedFee = caseFee ? Number(caseFee.agreedFee) : 0;
  const activePayments = payments.filter((p) => !p.isReversed);
  const totalPaid = activePayments.reduce((acc, p) => acc + Number(p.amount), 0);
  const balance = Math.max(0, agreedFee - totalPaid);
  const percentPaid = agreedFee > 0 ? Math.min(100, Math.round((totalPaid / agreedFee) * 100)) : 0;

  const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount), 0);
  const billableExpenses = expenses
    .filter((e) => e.isBillableToClient)
    .reduce((acc, e) => acc + Number(e.amount), 0);

  // Handlers
  async function handleCreateFee(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("caseId", caseId);
    formData.append("agreedFee", feeAmount);
    formData.append("notes", feeNotes);

    const validInst = installments
      .filter((i) => i.amount && i.dueDate)
      .map((i) => ({ amount: parseFloat(i.amount), dueDate: i.dueDate }));

    if (validInst.length > 0) {
      formData.append("installments", JSON.stringify(validInst));
    }

    const res = await createCaseFeeAction(formData);
    setLoading(false);
    if (res.success) {
      setMessage({ type: "success", text: res.message || "Fee agreement created!" });
      setShowFeeModal(false);
      window.location.reload();
    } else {
      setMessage({ type: "error", text: res.error || "Failed to create fee agreement." });
    }
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("caseId", caseId);
    formData.append("amount", payAmount);
    formData.append("paymentMethod", payMethod);
    formData.append("paymentDate", payDate);
    if (payRef) formData.append("referenceNumber", payRef);
    if (payNotes) formData.append("notes", payNotes);
    if (payInstallmentId) formData.append("installmentId", payInstallmentId);

    const res = await recordPaymentAction(formData);
    setLoading(false);
    if (res.success) {
      setMessage({ type: "success", text: res.message || "Payment recorded!" });
      setShowPaymentModal(false);
      setPayAmount("");
      setPayRef("");
      setPayNotes("");
      window.location.reload();
    } else {
      setMessage({ type: "error", text: res.error || "Failed to record payment." });
    }
  }

  async function handleReversePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!reversalPayment) return;
    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("paymentId", reversalPayment.id);
    formData.append("caseId", caseId);
    formData.append("reversalReason", reversalReason);

    const res = await reversePaymentAction(formData);
    setLoading(false);
    if (res.success) {
      setMessage({ type: "success", text: res.message || "Payment reversed." });
      setReversalPayment(null);
      setReversalReason("");
      window.location.reload();
    } else {
      setMessage({ type: "error", text: res.error || "Failed to reverse payment." });
    }
  }

  async function handleRecordExpense(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("caseId", caseId);
    formData.append("category", expCategory);
    formData.append("amount", expAmount);
    formData.append("expenseDate", expDate);
    formData.append("isBillableToClient", expBillable ? "true" : "false");
    if (expNotes) formData.append("notes", expNotes);

    const res = await recordExpenseAction(formData);
    setLoading(false);
    if (res.success) {
      setMessage({ type: "success", text: res.message || "Expense recorded!" });
      setShowExpenseModal(false);
      setExpAmount("");
      setExpNotes("");
      window.location.reload();
    } else {
      setMessage({ type: "error", text: res.error || "Failed to record expense." });
    }
  }

  async function handleUpdateExpenseStatus(expenseId: string, status: string) {
    setLoading(true);
    const formData = new FormData();
    formData.append("expenseId", expenseId);
    formData.append("caseId", caseId);
    formData.append("status", status);

    const res = await updateExpenseStatusAction(formData);
    setLoading(false);
    if (res.success) {
      window.location.reload();
    } else {
      setMessage({ type: "error", text: res.error || "Failed to update expense status." });
    }
  }

  async function handleExportLedger() {
    setLoading(true);
    const res = await exportFinancialReportAction("PAYMENTS", caseId);
    setLoading(false);
    if (res.success && res.csvContent) {
      const blob = new Blob([res.csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", res.fileName || "case_ledger.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      setMessage({ type: "error", text: res.error || "Failed to export ledger." });
    }
  }

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs ${
            message.type === "success"
              ? "bg-emerald-950/40 text-emerald-300 border border-emerald-800"
              : "bg-red-950/40 text-red-300 border border-red-800"
          }`}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-white ml-2 text-sm font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Agreed Fee */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Agreed Chambers Fee</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-white">
            PKR {agreedFee.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {caseFee ? `${caseFee.currency} Agreement` : "No fee agreement entered"}
          </p>
        </div>

        {/* Card 2: Total Collected */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Total Collected</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-emerald-400">
            PKR {totalPaid.toLocaleString()}
          </div>
          <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all"
              style={{ width: `${percentPaid}%` }}
            />
          </div>
        </div>

        {/* Card 3: Outstanding Receivables */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Outstanding Balance</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-amber-300">
            PKR {balance.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{100 - percentPaid}% remaining</p>
        </div>

        {/* Card 4: Court Expenses */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Incurred Expenses</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-purple-300">
            PKR {totalExpenses.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            PKR {billableExpenses.toLocaleString()} billable to client
          </p>
        </div>
      </div>

      {/* Fee Agreement / Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-400" />
            <span>Chambers Fee &amp; Payment Ledger</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable financial records, sequential receipt generation, and court disbursements
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && !caseFee && (
            <button
              onClick={() => setShowFeeModal(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Set Fee Agreement</span>
            </button>
          )}

          {canEdit && (
            <>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Record Payment</span>
              </button>

              <button
                onClick={() => setShowExpenseModal(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5 text-purple-400" />
                <span>Record Expense</span>
              </button>
            </>
          )}

          <button
            onClick={handleExportLedger}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Scheduled Installments (if any) */}
      {caseFee?.installments && caseFee.installments.length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Fee Installment Schedule
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {caseFee.installments.map((inst) => {
              const isPaid = inst.status === "PAID";
              const isOverdue = inst.status === "OVERDUE";
              return (
                <div
                  key={inst.id}
                  className={`p-3.5 rounded-xl border ${
                    isPaid
                      ? "bg-emerald-950/20 border-emerald-900/60"
                      : isOverdue
                      ? "bg-red-950/20 border-red-900/60"
                      : "bg-slate-950/60 border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">
                      Installment #{inst.installmentNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isPaid
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : isOverdue
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {inst.status}
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-bold font-mono text-white">
                    PKR {Number(inst.amount).toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Due: {new Date(inst.dueDate).toLocaleDateString("en-PK")}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Receipts & Payments Table */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Payment Receipts &amp; Audit Trail ({payments.length})
        </h4>

        {payments.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No payments have been recorded for this case yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] text-slate-400 uppercase bg-slate-950/60 border-y border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Receipt #</th>
                  <th className="py-2.5 px-3 font-semibold">Date</th>
                  <th className="py-2.5 px-3 font-semibold">Amount</th>
                  <th className="py-2.5 px-3 font-semibold">Method</th>
                  <th className="py-2.5 px-3 font-semibold">Ref / Notes</th>
                  <th className="py-2.5 px-3 font-semibold">Received By</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  {canEdit && <th className="py-2.5 px-3 font-semibold text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {payments.map((p) => (
                  <tr
                    key={p.id}
                    className={`hover:bg-slate-800/30 transition-colors ${
                      p.isReversed ? "opacity-60 bg-red-950/10" : ""
                    }`}
                  >
                    <td className="py-3 px-3 font-mono font-bold text-amber-400">
                      {p.receiptNumber}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {new Date(p.paymentDate).toLocaleDateString("en-PK")}
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-white">
                      PKR {Number(p.amount).toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 max-w-xs truncate">
                      {p.referenceNumber ? `Ref: ${p.referenceNumber}` : ""}{" "}
                      {p.notes ? `(${p.notes})` : ""}
                    </td>
                    <td className="py-3 px-3 text-slate-400">{p.receivedBy.fullName}</td>
                    <td className="py-3 px-3">
                      {p.isReversed ? (
                        <div className="flex flex-col">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400">
                            <RotateCcw className="w-3 h-3" /> REVERSED
                          </span>
                          <span className="text-[10px] text-red-300/80 truncate max-w-[140px]">
                            {p.reversalReason}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> ACTIVE
                        </span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="py-3 px-3 text-right">
                        {!p.isReversed && (
                          <button
                            onClick={() => setReversalPayment(p)}
                            className="px-2.5 py-1 rounded-lg bg-red-950/50 hover:bg-red-900/60 text-red-300 text-[11px] font-semibold border border-red-800/80 transition-colors inline-flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reverse</span>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Court Expenses Ledger */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Court Expenses &amp; Disbursements ({expenses.length})
        </h4>

        {expenses.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No expenses recorded for this matter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] text-slate-400 uppercase bg-slate-950/60 border-y border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Category</th>
                  <th className="py-2.5 px-3 font-semibold">Date</th>
                  <th className="py-2.5 px-3 font-semibold">Amount</th>
                  <th className="py-2.5 px-3 font-semibold">Billable</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold">Incurred By</th>
                  <th className="py-2.5 px-3 font-semibold">Notes</th>
                  {canEdit && <th className="py-2.5 px-3 font-semibold text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-medium text-white">
                      {e.category.replace(/_/g, " ")}
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {new Date(e.expenseDate).toLocaleDateString("en-PK")}
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-amber-300">
                      PKR {Number(e.amount).toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          e.isBillableToClient
                            ? "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {e.isBillableToClient ? "BILLABLE" : "FIRM"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          e.paymentStatus === "REIMBURSED"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {e.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">{e.incurredBy.fullName}</td>
                    <td className="py-3 px-3 text-slate-400 max-w-xs truncate">{e.notes || "—"}</td>
                    {canEdit && (
                      <td className="py-3 px-3 text-right">
                        {e.paymentStatus !== "REIMBURSED" && (
                          <button
                            onClick={() => handleUpdateExpenseStatus(e.id, "REIMBURSED")}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[11px] font-semibold border border-slate-700 transition-colors"
                          >
                            Mark Reimbursed
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Set Fee Agreement */}
      {showFeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-400" />
              <span>Chambers Fee Agreement</span>
            </h3>
            <p className="text-xs text-slate-400">
              Set the agreed professional fee and optional payment installments for this litigation matter.
            </p>

            <form onSubmit={handleCreateFee} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Agreed Fee (PKR) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1000"
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(e.target.value)}
                  placeholder="e.g. 500000"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notes / Terms
                </label>
                <textarea
                  rows={2}
                  value={feeNotes}
                  onChange={(e) => setFeeNotes(e.target.value)}
                  placeholder="e.g. Includes drafting and High Court hearings up to judgment."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>

              {/* Installments Setup */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Scheduled Installments
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setInstallments([...installments, { amount: "", dueDate: "" }])
                    }
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold"
                  >
                    + Add Installment
                  </button>
                </div>

                {installments.map((inst, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 font-mono w-6">#{idx + 1}</span>
                    <input
                      type="number"
                      placeholder="Amount (PKR)"
                      value={inst.amount}
                      onChange={(e) => {
                        const copy = [...installments];
                        copy[idx].amount = e.target.value;
                        setInstallments(copy);
                      }}
                      className="w-1/2 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono"
                    />
                    <input
                      type="date"
                      value={inst.dueDate}
                      onChange={(e) => {
                        const copy = [...installments];
                        copy[idx].dueDate = e.target.value;
                        setInstallments(copy);
                      }}
                      className="w-1/2 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs"
                    />
                    {installments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setInstallments(installments.filter((_, i) => i !== idx))}
                        className="text-slate-500 hover:text-red-400 px-1 text-xs"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFeeModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors"
                >
                  {loading ? "Saving..." : "Save Agreement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Payment */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-400" />
              <span>Record Client Payment</span>
            </h3>
            <p className="text-xs text-slate-400">
              Generates an immutable sequential receipt (e.g. RCP-2026-XXXX) and reconciles against fee installments.
            </p>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Amount (PKR) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="e.g. 100000"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-emerald-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-400 focus:outline-none"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Cash</option>
                    <option value="ONLINE">Online</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Reference / Cheque #
                  </label>
                  <input
                    type="text"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder="e.g. CHQ-981240"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  />
                </div>
              </div>

              {caseFee?.installments && caseFee.installments.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Apply to Installment (Optional - defaults to FIFO)
                  </label>
                  <select
                    value={payInstallmentId}
                    onChange={(e) => setPayInstallmentId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  >
                    <option value="">Auto FIFO (Earliest pending installment)</option>
                    {caseFee.installments.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        Installment #{inst.installmentNumber} - PKR{" "}
                        {Number(inst.amount).toLocaleString()} (Due:{" "}
                        {new Date(inst.dueDate).toLocaleDateString("en-PK")}) [{inst.status}]
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Received from client representative via PayOrder"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                >
                  {loading ? "Generating Receipt..." : "Record & Issue Receipt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reverse Payment */}
      {reversalPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-red-900/60 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-red-400 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-red-400" />
              <span>Reverse Receipt {reversalPayment.receiptNumber}</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Accounting records are strictly immutable. This payment of{" "}
              <strong className="text-white font-mono">
                PKR {Number(reversalPayment.amount).toLocaleString()}
              </strong>{" "}
              will not be deleted. It will be marked as reversed, adjusting the case balance and installment status.
            </p>

            <form onSubmit={handleReversePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reversal Reason (Required) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="e.g. Cheque dishonored by bank / recorded against incorrect client account."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-red-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setReversalPayment(null);
                    setReversalReason("");
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
                >
                  {loading ? "Reversing..." : "Confirm Reversal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Expense */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              <span>Record Court Expense</span>
            </h3>
            <p className="text-xs text-slate-400">
              Log court fees, judicial stamp papers, commissioner charges, or travel disbursements.
            </p>

            <form onSubmit={handleRecordExpense} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Expense Category *
                  </label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  >
                    <option value="COURT_FEE">Court Fee</option>
                    <option value="STAMP_PAPER">Judicial Stamp Paper</option>
                    <option value="ADVOCATE_COMMISSION">Advocate Commission</option>
                    <option value="PROCESS_SERVER">Process Server Fee</option>
                    <option value="TRAVEL">Counsel Travel / Transit</option>
                    <option value="PHOTOCOPY_PRINTING">Photocopy &amp; Printing</option>
                    <option value="OTHER">Other Disbursement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Amount (PKR) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-purple-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 font-semibold">
                    <input
                      type="checkbox"
                      checked={expBillable}
                      onChange={(e) => setExpBillable(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-0"
                    />
                    <span>Billable to Client</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes</label>
                <input
                  type="text"
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  placeholder="e.g. Supreme Court paper book binding and urgent hearing fee."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors"
                >
                  {loading ? "Recording..." : "Record Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
