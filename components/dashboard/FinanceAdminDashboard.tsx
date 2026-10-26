"use client";

import React, { useState } from "react";
import {
  DollarSign,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Layers,
  Upload,
  AlertCircle,
  FileText,
  Search,
} from "lucide-react";
import { exportFinancialReportAction, importClientsAction } from "@/lib/finance/actions";
import { FinancialOverviewReport } from "@/lib/finance/reports";

interface FinanceAdminDashboardProps {
  overview?: FinancialOverviewReport;
}

export function FinanceAdminDashboard({ overview }: FinanceAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "cases" | "importer">("overview");
  const [exportLoading, setExportLoading] = useState(false);
  const [importerLoading, setImporterLoading] = useState(false);
  const [importSummary, setImportSummary] = useState<any | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [filterQuery, setFilterQuery] = useState("");
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Defaults if overview is empty
  const totalAgreed = overview?.totalAgreed ?? 0;
  const totalCollected = overview?.totalCollected ?? 0;
  const totalOutstanding = overview?.totalOutstanding ?? 0;
  const collectionRate = overview?.collectionRatePercent ?? 0;
  const aging = overview?.aging ?? {
    current: 0,
    days1_30: 0,
    days31_60: 0,
    days61_90: 0,
    days90Plus: 0,
    totalOverdue: 0,
  };
  const recentPayments = overview?.recentPayments ?? [];
  const caseLedgers = overview?.caseLedgers ?? [];

  async function handleExport(exportType: "PAYMENTS" | "CASE_LEDGER" | "EXPENSES") {
    setExportLoading(true);
    setNotification(null);
    try {
      const res = await exportFinancialReportAction(exportType);
      if (res.success && res.csvContent) {
        const blob = new Blob([res.csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", res.fileName || `${exportType.toLowerCase()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setNotification({ type: "success", text: `Successfully exported ${res.rowCount} rows.` });
      } else {
        setNotification({ type: "error", text: res.error || "Export failed." });
      }
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Export error." });
    } finally {
      setExportLoading(false);
    }
  }

  async function handleImportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!csvFile) {
      setNotification({ type: "error", text: "Please select a CSV file to import." });
      return;
    }

    setImporterLoading(true);
    setNotification(null);

    const formData = new FormData();
    formData.append("csvFile", csvFile);
    formData.append("dryRun", dryRun ? "true" : "false");

    const res = await importClientsAction(formData);
    setImporterLoading(false);

    if (res.success && res.summary) {
      setImportSummary(res.summary);
      if (dryRun) {
        setNotification({
          type: "success",
          text: `Dry run validation complete: ${res.summary.validCount} valid, ${res.summary.invalidCount} errors, ${res.summary.duplicateCount} duplicates found.`,
        });
      } else {
        setNotification({
          type: "success",
          text: `Import successful: ${res.summary.importedCount} new client records created.`,
        });
      }
    } else {
      setNotification({ type: "error", text: res.error || "Client import failed." });
    }
  }

  const filteredLedgers = caseLedgers.filter(
    (c) =>
      c.caseNumber.toLowerCase().includes(filterQuery.toLowerCase()) ||
      c.caseTitle.toLowerCase().includes(filterQuery.toLowerCase()) ||
      c.clientName.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/20 shadow-xl">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-2">
            <DollarSign className="w-3 h-3" />
            <span>Chambers Financial Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Finance &amp; Accounts Ledger</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time receivables aging, atomic receipt series, and client data bulk import
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleExport("CASE_LEDGER")}
            disabled={exportLoading}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Ledgers</span>
          </button>
          <button
            onClick={() => handleExport("PAYMENTS")}
            disabled={exportLoading}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <Receipt className="w-3.5 h-3.5 text-amber-400" />
            <span>Export Receipts</span>
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs ${
            notification.type === "success"
              ? "bg-emerald-950/40 text-emerald-300 border border-emerald-800"
              : "bg-red-950/40 text-red-300 border border-red-800"
          }`}
        >
          <span>{notification.text}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white ml-2 text-sm font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs font-medium text-slate-400">Total Agreed Fees</span>
          <p className="text-2xl font-bold font-mono text-white mt-2">
            PKR {totalAgreed.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Across all accessible matters</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs font-medium text-slate-400">Collected in Chambers</span>
          <p className="text-2xl font-bold font-mono text-emerald-400 mt-2">
            PKR {totalCollected.toLocaleString()}
          </p>
          <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full"
              style={{ width: `${collectionRate}%` }}
            />
          </div>
          <p className="text-[11px] text-emerald-400 mt-1">{collectionRate}% collection rate</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs font-medium text-slate-400">Total Outstanding</span>
          <p className="text-2xl font-bold font-mono text-amber-400 mt-2">
            PKR {totalOutstanding.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            PKR {aging.totalOverdue.toLocaleString()} past due date
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs font-medium text-slate-400">Receivables Aging &gt;90d</span>
          <p className="text-2xl font-bold font-mono text-red-400 mt-2">
            PKR {aging.days90Plus.toLocaleString()}
          </p>
          <p className="text-[11px] text-red-400/80 mt-1">High risk receivables</p>
        </div>
      </div>

      {/* Receivables Aging Breakdown Bar */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Receivables Aging Schedule (Past Due Installments)</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Total Overdue: PKR {aging.totalOverdue.toLocaleString()}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Current (Not Due)</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              PKR {aging.current.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/40">
            <span className="text-amber-300/80 block text-[11px]">1 - 30 Days</span>
            <span className="font-mono font-bold text-amber-300 text-sm">
              PKR {aging.days1_30.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/50">
            <span className="text-amber-400 block text-[11px]">31 - 60 Days</span>
            <span className="font-mono font-bold text-amber-400 text-sm">
              PKR {aging.days31_60.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-red-950/20 border border-red-900/40">
            <span className="text-red-300/80 block text-[11px]">61 - 90 Days</span>
            <span className="font-mono font-bold text-red-300 text-sm">
              PKR {aging.days61_90.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60">
            <span className="text-red-400 block text-[11px]">&gt; 90 Days</span>
            <span className="font-mono font-bold text-red-400 text-sm">
              PKR {aging.days90Plus.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs: Overview vs Case Ledgers vs Client Importer */}
      <div className="flex space-x-1 border-b border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-3.5 py-2.5 font-semibold transition-colors flex items-center gap-1.5 border-b-2 -mb-px ${
            activeTab === "overview"
              ? "border-emerald-400 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Recent Receipts ({recentPayments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("cases")}
          className={`px-3.5 py-2.5 font-semibold transition-colors flex items-center gap-1.5 border-b-2 -mb-px ${
            activeTab === "cases"
              ? "border-emerald-400 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Case Ledgers ({caseLedgers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("importer")}
          className={`px-3.5 py-2.5 font-semibold transition-colors flex items-center gap-1.5 border-b-2 -mb-px ${
            activeTab === "importer"
              ? "border-emerald-400 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Bulk Client Importer (CSV)</span>
        </button>
      </div>

      {/* Tab 1: Recent Receipts */}
      {activeTab === "overview" && (
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Verified Receipt Series (Latest 10)
          </h3>

          {recentPayments.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No payments have been recorded in the system yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="pb-2.5 px-3 font-medium">Receipt #</th>
                    <th className="pb-2.5 px-3 font-medium">Case Number</th>
                    <th className="pb-2.5 px-3 font-medium">Matter Title</th>
                    <th className="pb-2.5 px-3 font-medium">Amount</th>
                    <th className="pb-2.5 px-3 font-medium">Date</th>
                    <th className="pb-2.5 px-3 font-medium">Method</th>
                    <th className="pb-2.5 px-3 font-medium">Cashier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                  {recentPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-3 font-mono text-emerald-400 font-bold">
                        {p.receiptNumber}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-200">{p.caseNumber}</td>
                      <td className="py-3 px-3 text-white max-w-xs truncate">{p.caseTitle}</td>
                      <td className="py-3 px-3 font-mono font-semibold text-white">
                        PKR {p.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-slate-400">{p.paymentDate}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400">{p.receivedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Case Ledgers */}
      {activeTab === "cases" && (
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Matter-Wise Fee &amp; Receivables Ledger
            </h3>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search matter, client, or number..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="pb-2.5 px-3 font-medium">Matter #</th>
                  <th className="pb-2.5 px-3 font-medium">Client</th>
                  <th className="pb-2.5 px-3 font-medium">Title</th>
                  <th className="pb-2.5 px-3 font-medium">Agreed Fee</th>
                  <th className="pb-2.5 px-3 font-medium">Collected</th>
                  <th className="pb-2.5 px-3 font-medium">Balance</th>
                  <th className="pb-2.5 px-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                {filteredLedgers.map((c) => (
                  <tr key={c.caseId} className="hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-mono text-amber-400 font-semibold">
                      {c.caseNumber}
                    </td>
                    <td className="py-3 px-3 text-white font-medium">{c.clientName}</td>
                    <td className="py-3 px-3 text-slate-300 max-w-xs truncate">{c.caseTitle}</td>
                    <td className="py-3 px-3 font-mono font-medium">
                      PKR {c.agreedFee.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-emerald-400">
                      PKR {c.totalPaid.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-300">
                      PKR {c.balance.toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Client Importer */}
      {activeTab === "importer" && (
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Bulk Client CSV Data Importer</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Import clients with automated CNIC verification, phone format checks, and duplicate screening.
            </p>
          </div>

          <form onSubmit={handleImportSubmit} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Select CSV File *
              </label>
              <input
                type="file"
                accept=".csv"
                required
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Columns supported: <code className="text-amber-400">Name</code>,{" "}
                <code className="text-amber-400">Mobile</code>,{" "}
                <code className="text-amber-400">CNIC</code>,{" "}
                <code className="text-amber-400">ClientType</code>,{" "}
                <code className="text-amber-400">Email</code>,{" "}
                <code className="text-amber-400">Address</code>
              </p>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <input
                type="checkbox"
                id="dryRunCheckbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
              />
              <label htmlFor="dryRunCheckbox" className="text-xs text-slate-300 cursor-pointer">
                <span className="font-semibold text-white block">Dry Run Mode (Preview Only)</span>
                <span className="text-slate-500 text-[11px]">
                  Validate format and check for database duplicates without committing records.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={importerLoading}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                dryRun
                  ? "bg-amber-500 hover:bg-amber-400 text-slate-950"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
              }`}
            >
              {importerLoading
                ? "Processing..."
                : dryRun
                ? "Run Dry-Run Validation"
                : "Commit Client Import"}
            </button>
          </form>

          {/* Validation Results Display */}
          {importSummary && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Import Summary Result</span>
                <span className="text-slate-400">
                  {importSummary.dryRun ? "PREVIEW (DRY RUN)" : "COMMITTED TO DATABASE"}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-900 text-center">
                  <span className="text-[10px] text-slate-500 block">Total</span>
                  <span className="font-bold text-white">{importSummary.totalRows}</span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-950/40 text-center border border-emerald-900/60">
                  <span className="text-[10px] text-emerald-400 block">Valid</span>
                  <span className="font-bold text-emerald-400">{importSummary.validCount}</span>
                </div>
                <div className="p-2 rounded-lg bg-red-950/40 text-center border border-red-900/60">
                  <span className="text-[10px] text-red-400 block">Errors</span>
                  <span className="font-bold text-red-400">{importSummary.invalidCount}</span>
                </div>
                <div className="p-2 rounded-lg bg-amber-950/40 text-center border border-amber-900/60">
                  <span className="text-[10px] text-amber-400 block">Duplicates</span>
                  <span className="font-bold text-amber-400">{importSummary.duplicateCount}</span>
                </div>
              </div>

              {/* Rows detail */}
              <div className="max-h-60 overflow-y-auto space-y-1.5 text-[11px] pt-2">
                {importSummary.rows.map((r: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg border flex items-center justify-between ${
                      r.isValid
                        ? "bg-slate-900/60 border-slate-800 text-slate-300"
                        : r.isDuplicate
                        ? "bg-amber-950/20 border-amber-900/40 text-amber-300"
                        : "bg-red-950/20 border-red-900/40 text-red-300"
                    }`}
                  >
                    <div>
                      <span className="font-mono text-slate-500 mr-2">Row #{r.rowNumber}</span>
                      <strong className="text-white">{r.data.name || "(Empty Name)"}</strong>{" "}
                      <span className="text-slate-400">&bull; {r.data.mobile}</span>
                      {r.data.cnic && (
                        <span className="text-slate-400"> &bull; CNIC: {r.data.cnic}</span>
                      )}
                    </div>
                    <div>
                      {r.isValid ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Valid
                        </span>
                      ) : (
                        <span className="text-xs font-semibold">
                          {r.duplicateReason || r.errors.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
