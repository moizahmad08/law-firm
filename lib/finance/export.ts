import { withUserContext } from "@/lib/database/context";
import { recordAuthAudit } from "@/lib/auth/audit";

export type ExportType = "PAYMENTS" | "CASE_LEDGER" | "EXPENSES" | "AGING_REPORT";

export interface ExportReportInput {
  userId: string;
  exportType: ExportType;
  caseId?: string;
  startDate?: string;
  endDate?: string;
  ipAddress?: string;
}

export interface ExportReportResult {
  fileName: string;
  mimeType: string;
  csvContent: string;
  rowCount: number;
}

/**
 * Generates CSV export for financial reports, with mandatory security audit and ExportLog recording.
 */
export async function exportFinancialReport(input: ExportReportInput): Promise<ExportReportResult> {
  return await withUserContext(input.userId, async (tx) => {
    let csvContent = "";
    let rowCount = 0;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    let fileName = `LMS_${input.exportType}_${timestamp}.csv`;

    if (input.exportType === "PAYMENTS") {
      const whereClause: any = { isReversed: false };
      if (input.caseId) whereClause.caseId = input.caseId;
      if (input.startDate || input.endDate) {
        whereClause.paymentDate = {};
        if (input.startDate) whereClause.paymentDate.gte = new Date(input.startDate);
        if (input.endDate) whereClause.paymentDate.lte = new Date(input.endDate);
      }

      const payments = await tx.payment.findMany({
        where: whereClause,
        include: {
          case: { select: { caseNumber: true, title: true } },
          receivedBy: { select: { fullName: true } },
        },
        orderBy: { paymentDate: "desc" },
      });

      rowCount = payments.length;
      csvContent = "Receipt Number,Case Number,Case Title,Amount (PKR),Payment Date,Payment Method,Reference,Received By,Notes\n";
      for (const p of payments) {
        const row = [
          `"${p.receiptNumber}"`,
          `"${p.case.caseNumber}"`,
          `"${p.case.title.replace(/"/g, '""')}"`,
          Number(p.amount).toFixed(2),
          p.paymentDate.toISOString().split("T")[0],
          p.paymentMethod,
          `"${p.referenceNumber || ""}"`,
          `"${p.receivedBy.fullName}"`,
          `"${(p.notes || "").replace(/"/g, '""')}"`,
        ];
        csvContent += row.join(",") + "\n";
      }
    } else if (input.exportType === "EXPENSES") {
      const whereClause: any = {};
      if (input.caseId) whereClause.caseId = input.caseId;
      if (input.startDate || input.endDate) {
        whereClause.expenseDate = {};
        if (input.startDate) whereClause.expenseDate.gte = new Date(input.startDate);
        if (input.endDate) whereClause.expenseDate.lte = new Date(input.endDate);
      }

      const expenses = await tx.expense.findMany({
        where: whereClause,
        include: {
          case: { select: { caseNumber: true, title: true } },
          incurredBy: { select: { fullName: true } },
        },
        orderBy: { expenseDate: "desc" },
      });

      rowCount = expenses.length;
      csvContent = "Case Number,Case Title,Category,Amount (PKR),Expense Date,Billable To Client,Payment Status,Incurred By,Notes\n";
      for (const e of expenses) {
        const row = [
          `"${e.case.caseNumber}"`,
          `"${e.case.title.replace(/"/g, '""')}"`,
          e.category,
          Number(e.amount).toFixed(2),
          e.expenseDate.toISOString().split("T")[0],
          e.isBillableToClient ? "YES" : "NO",
          e.paymentStatus,
          `"${e.incurredBy.fullName}"`,
          `"${(e.notes || "").replace(/"/g, '""')}"`,
        ];
        csvContent += row.join(",") + "\n";
      }
    } else if (input.exportType === "CASE_LEDGER") {
      const cases = await tx.case.findMany({
        where: input.caseId ? { id: input.caseId } : undefined,
        include: {
          client: { select: { name: true } },
          status: { select: { code: true } },
          fee: true,
          payments: { where: { isReversed: false } },
        },
      });

      rowCount = cases.length;
      csvContent = "Case Number,Case Title,Client Name,Agreed Fee (PKR),Total Paid (PKR),Outstanding Balance (PKR),Status\n";
      for (const c of cases) {
        const agreed = c.fee ? Number(c.fee.agreedFee) : 0;
        const paid = c.payments.reduce((acc, p) => acc + Number(p.amount), 0);
        const balance = Math.max(0, agreed - paid);

        const row = [
          `"${c.caseNumber}"`,
          `"${c.title.replace(/"/g, '""')}"`,
          `"${(c.client?.name || "").replace(/"/g, '""')}"`,
          agreed.toFixed(2),
          paid.toFixed(2),
          balance.toFixed(2),
          c.status?.code || "ACTIVE",
        ];
        csvContent += row.join(",") + "\n";
      }
    } else {
      throw new Error(`Unsupported export type: ${input.exportType}`);
    }

    // Record in export_logs
    await tx.exportLog.create({
      data: {
        userId: input.userId,
        exportType: input.exportType,
        fileFormat: "CSV",
        filtersJson: {
          caseId: input.caseId || null,
          startDate: input.startDate || null,
          endDate: input.endDate || null,
        },
        rowCount,
        ipAddress: input.ipAddress || null,
      },
    });

    // Record audit event
    await recordAuthAudit({
      userId: input.userId,
      action: "DATA_EXPORTED",
      metadata: {
        exportType: input.exportType,
        rowCount,
        fileName,
      },
    });

    return {
      fileName,
      mimeType: "text/csv; charset=utf-8",
      csvContent,
      rowCount,
    };
  });
}
