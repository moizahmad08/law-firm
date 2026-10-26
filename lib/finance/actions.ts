"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import {
  createCaseFee,
  recordPayment,
  reversePayment,
  recordExpense,
  updateExpenseStatus,
} from "@/lib/finance/service";
import { exportFinancialReport, ExportType } from "@/lib/finance/export";
import { importClients } from "@/lib/importer/client-import";
import { PaymentMethod, ExpenseCategory, ExpenseStatus } from "@prisma/client";

export async function createCaseFeeAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const caseId = formData.get("caseId") as string;
  const agreedFee = parseFloat(formData.get("agreedFee") as string);
  const currency = (formData.get("currency") as string) || "PKR";
  const notes = (formData.get("notes") as string) || undefined;
  const installmentsRaw = formData.get("installments") as string;

  if (!caseId || isNaN(agreedFee) || agreedFee < 0) {
    return { success: false, error: "Valid Case ID and positive agreed fee are required." };
  }

  let installments: Array<{ amount: number; dueDate: string }> | undefined;
  if (installmentsRaw) {
    try {
      installments = JSON.parse(installmentsRaw);
    } catch {
      return { success: false, error: "Invalid installments JSON structure." };
    }
  }

  try {
    const fee = await createCaseFee({
      caseId,
      agreedFee,
      currency,
      notes,
      agreedById: user.id,
      installments,
    });

    revalidatePath(`/cases/${caseId}`);
    return { success: true, feeId: fee.id, message: "Fee agreement created successfully." };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create fee agreement." };
  }
}

export async function recordPaymentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const caseId = formData.get("caseId") as string;
  const installmentId = (formData.get("installmentId") as string) || null;
  const amount = parseFloat(formData.get("amount") as string);
  const paymentMethod = (formData.get("paymentMethod") as PaymentMethod) || PaymentMethod.BANK_TRANSFER;
  const paymentDate = (formData.get("paymentDate") as string) || undefined;
  const referenceNumber = (formData.get("referenceNumber") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  if (!caseId || isNaN(amount) || amount <= 0) {
    return { success: false, error: "Valid Case ID and positive payment amount are required." };
  }

  try {
    const payment = await recordPayment({
      caseId,
      installmentId,
      amount,
      paymentMethod,
      paymentDate,
      referenceNumber,
      notes,
      receivedById: user.id,
    });

    revalidatePath(`/cases/${caseId}`);
    return {
      success: true,
      receiptNumber: payment.receiptNumber,
      paymentId: payment.id,
      message: `Payment of PKR ${amount.toLocaleString()} recorded under receipt ${payment.receiptNumber}.`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to record payment." };
  }
}

export async function reversePaymentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const paymentId = formData.get("paymentId") as string;
  const caseId = formData.get("caseId") as string;
  const reversalReason = formData.get("reversalReason") as string;

  if (!paymentId || !reversalReason || reversalReason.trim().length < 5) {
    return { success: false, error: "Payment ID and a detailed reason (at least 5 chars) are required." };
  }

  try {
    const reversed = await reversePayment({
      paymentId,
      reversalReason,
      userId: user.id,
    });

    if (caseId) {
      revalidatePath(`/cases/${caseId}`);
    }
    return {
      success: true,
      message: `Receipt ${reversed.receiptNumber} successfully reversed.`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to reverse payment." };
  }
}

export async function recordExpenseAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const caseId = formData.get("caseId") as string;
  const category = (formData.get("category") as ExpenseCategory) || ExpenseCategory.OTHER;
  const amount = parseFloat(formData.get("amount") as string);
  const expenseDate = (formData.get("expenseDate") as string) || undefined;
  const isBillableToClient = formData.get("isBillableToClient") !== "false";
  const notes = (formData.get("notes") as string) || null;

  if (!caseId || isNaN(amount) || amount <= 0) {
    return { success: false, error: "Valid Case ID and positive expense amount are required." };
  }

  try {
    const expense = await recordExpense({
      caseId,
      category,
      amount,
      expenseDate,
      isBillableToClient,
      notes,
      incurredById: user.id,
    });

    revalidatePath(`/cases/${caseId}`);
    return {
      success: true,
      expenseId: expense.id,
      message: "Expense recorded successfully.",
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to record expense." };
  }
}

export async function updateExpenseStatusAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const expenseId = formData.get("expenseId") as string;
  const caseId = formData.get("caseId") as string;
  const status = formData.get("status") as ExpenseStatus;

  if (!expenseId || !status) {
    return { success: false, error: "Expense ID and status are required." };
  }

  try {
    await updateExpenseStatus({
      expenseId,
      status,
      userId: user.id,
    });

    if (caseId) {
      revalidatePath(`/cases/${caseId}`);
    }
    return { success: true, message: `Expense status updated to ${status}.` };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update expense status." };
  }
}

export async function exportFinancialReportAction(exportType: ExportType, caseId?: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const result = await exportFinancialReport({
      userId: user.id,
      exportType,
      caseId,
    });

    return {
      success: true,
      fileName: result.fileName,
      mimeType: result.mimeType,
      csvContent: result.csvContent,
      rowCount: result.rowCount,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Export failed." };
  }
}

export async function importClientsAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const csvFile = formData.get("csvFile") as File;
  const dryRun = formData.get("dryRun") === "true";

  if (!csvFile) {
    return { success: false, error: "CSV file is required." };
  }

  try {
    const csvContent = await csvFile.text();
    const result = await importClients({
      userId: user.id,
      csvContent,
      dryRun,
    });

    return { success: true, summary: result };
  } catch (err: any) {
    return { success: false, error: err.message || "Client import failed." };
  }
}
