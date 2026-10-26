import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/database/client";
import { withUserContext } from "@/lib/database/context";
import {
  createCaseFee,
  recordPayment,
  reversePayment,
  recordExpense,
  updateExpenseStatus,
  getCaseFinancialSummary,
} from "@/lib/finance/service";
import { getFinancialOverview } from "@/lib/finance/reports";
import { exportFinancialReport } from "@/lib/finance/export";
import {
  PaymentMethod,
  ExpenseCategory,
  ExpenseStatus,
  InstallmentStatus,
  Role,
  PrismaClient,
} from "@prisma/client";

describe("Milestone 4 - Finance & Expenses Engine", () => {
  let financeAdminId: string;
  let lawyerAlphaId: string;
  let lawyerBetaId: string;
  let generalCaseId: string;
  let restrictedCaseId: string;

  beforeAll(async () => {
    // Retrieve users from seed
    const officeAdmin = await prisma.user.findFirstOrThrow({
      where: { role: Role.OFFICE_ADMIN },
    });
    const financeAdmin = await prisma.user.findFirstOrThrow({
      where: { email: "finance.head@lawfirm.local" },
    });
    const lawyerAlpha = await prisma.user.findFirstOrThrow({
      where: { email: "counsel.alpha@lawfirm.local" },
    });
    const lawyerBeta = await prisma.user.findFirstOrThrow({
      where: { email: "counsel.beta@lawfirm.local" },
    });

    financeAdminId = financeAdmin.id;
    lawyerAlphaId = lawyerAlpha.id;
    lawyerBetaId = lawyerBeta.id;

    // Create a fresh dedicated test case under OFFICE_ADMIN to guarantee idempotency across multiple runs
    const c1 = await withUserContext(officeAdmin.id, async (tx) => {
      const client = await tx.client.findFirstOrThrow();
      const status = await tx.caseStatus.findFirstOrThrow({ where: { code: "ACTIVE" } });
      const createdCase = await tx.case.create({
        data: {
          caseNumber: `FIN-TEST-${Date.now()}`,
          title: "Finance Suite Commercial Recovery Case",
          court: "Lahore High Court",
          province: "PUNJAB",
          city: "Lahore",
          jurisdiction: "CIVIL",
          caseType: "Commercial",
          clientId: client.id,
          statusId: status.id,
          isRestricted: false,
        },
      });

      // Assign lawyerAlpha as Lead Counsel
      await tx.caseAssignment.create({
        data: {
          caseId: createdCase.id,
          userId: lawyerAlphaId,
          roleInCase: "LEAD_COUNSEL",
          isActive: true,
        },
      });

      return createdCase;
    });

    const c2 = await withUserContext(lawyerBetaId, async (tx) => {
      return await tx.case.findFirstOrThrow({
        where: { caseNumber: "CS-202/2026" },
      });
    });

    generalCaseId = c1.id;
    restrictedCaseId = c2.id;
  });

  it("creates a fee agreement with scheduled installments", async () => {
    const fee = await createCaseFee({
      caseId: generalCaseId,
      agreedFee: 300000,
      currency: "PKR",
      notes: "Professional fee for writ petition up to final hearing",
      agreedById: financeAdminId,
      installments: [
        { amount: 150000, dueDate: new Date(Date.now() + 7 * 86400000) },
        { amount: 150000, dueDate: new Date(Date.now() + 30 * 86400000) },
      ],
    });

    expect(fee).toBeDefined();
    expect(Number(fee.agreedFee)).toBe(300000);
    expect(fee.installments.length).toBe(2);
    expect(fee.installments[0].status).toBe(InstallmentStatus.PENDING);
  });

  it("generates atomic sequential receipts and reconciles installments", async () => {
    // Payment 1: Partial payment of 100,000 for Installment 1 (150,000)
    const p1 = await recordPayment({
      caseId: generalCaseId,
      amount: 100000,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      referenceNumber: "TXN-9021",
      notes: "First installment partial payment via Raast",
      receivedById: financeAdminId,
    });

    expect(p1.receiptNumber).toMatch(/^RCP-\d{4}-\d{4}$/);
    expect(Number(p1.amount)).toBe(100000);

    // Verify installment is PARTIALLY_PAID
    const summary1 = await getCaseFinancialSummary(generalCaseId, financeAdminId);
    expect(summary1.installments[0].status).toBe(InstallmentStatus.PARTIALLY_PAID);
    expect(summary1.totalPaid).toBe(100000);
    expect(summary1.outstandingBalance).toBe(200000);

    // Payment 2: Remaining 50,000 for Installment 1
    const p2 = await recordPayment({
      caseId: generalCaseId,
      amount: 50000,
      paymentMethod: PaymentMethod.CHEQUE,
      referenceNumber: "CHQ-88124",
      notes: "Completing first installment",
      receivedById: financeAdminId,
    });

    expect(p2.receiptNumber).toMatch(/^RCP-\d{4}-\d{4}$/);
    // Sequential receipt check: p2 receipt sequence > p1 receipt sequence
    const seq1 = parseInt(p1.receiptNumber.split("-")[2], 10);
    const seq2 = parseInt(p2.receiptNumber.split("-")[2], 10);
    expect(seq2).toBe(seq1 + 1);

    // Verify installment is now PAID
    const summary2 = await getCaseFinancialSummary(generalCaseId, financeAdminId);
    expect(summary2.installments[0].status).toBe(InstallmentStatus.PAID);
    expect(summary2.totalPaid).toBe(150000);
    expect(summary2.outstandingBalance).toBe(150000);
  });

  it("strictly reverses payment without deletion and recalibrates balance", async () => {
    // Record payment 3
    const p3 = await recordPayment({
      caseId: generalCaseId,
      amount: 75000,
      paymentMethod: PaymentMethod.CASH,
      notes: "Cash receipt to be reversed",
      receivedById: financeAdminId,
    });

    const summaryBefore = await getCaseFinancialSummary(generalCaseId, financeAdminId);
    expect(summaryBefore.totalPaid).toBe(225000);

    // Reverse payment 3
    const reversed = await reversePayment({
      paymentId: p3.id,
      reversalReason: "Cashier entered incorrect deposit amount from client slip",
      userId: financeAdminId,
    });

    expect(reversed.isReversed).toBe(true);
    expect(reversed.reversalReason).toContain("Cashier entered incorrect deposit");
    expect(reversed.reversedById).toBe(financeAdminId);

    // Check financial summary reflects reversal
    const summaryAfter = await getCaseFinancialSummary(generalCaseId, financeAdminId);
    expect(summaryAfter.totalPaid).toBe(150000);
    expect(summaryAfter.outstandingBalance).toBe(150000);
    expect(summaryAfter.reversedPayments.length).toBe(1);

    // Attempting to reverse again throws an error
    await expect(
      reversePayment({
        paymentId: p3.id,
        reversalReason: "Trying to reverse already reversed payment",
        userId: financeAdminId,
      })
    ).rejects.toThrow(/already been reversed/);
  });

  it("records court expenses and updates reimbursement status", async () => {
    const expense = await recordExpense({
      caseId: generalCaseId,
      category: ExpenseCategory.STAMP_PAPER,
      amount: 15000,
      isBillableToClient: true,
      notes: "High Court judicial paper book stamps",
      incurredById: lawyerAlphaId,
    });

    expect(expense).toBeDefined();
    expect(Number(expense.amount)).toBe(15000);
    expect(expense.paymentStatus).toBe(ExpenseStatus.OUTSTANDING);

    // Update status to REIMBURSED
    const updated = await updateExpenseStatus({
      expenseId: expense.id,
      status: ExpenseStatus.REIMBURSED,
      userId: financeAdminId,
    });

    expect(updated.paymentStatus).toBe(ExpenseStatus.REIMBURSED);
  });

  it("calculates firm-wide financial overview and receivables aging", async () => {
    const overview = await getFinancialOverview(financeAdminId);

    expect(overview.totalAgreed).toBeGreaterThanOrEqual(300000);
    expect(overview.totalCollected).toBeGreaterThanOrEqual(150000);
    expect(overview.recentPayments.length).toBeGreaterThan(0);
    expect(overview.aging).toBeDefined();
    expect(overview.caseLedgers.length).toBeGreaterThan(0);
  });

  it("exports financial data to CSV and creates security ExportLog", async () => {
    const exportResult = await exportFinancialReport({
      userId: financeAdminId,
      exportType: "PAYMENTS",
    });

    expect(exportResult.mimeType).toContain("text/csv");
    expect(exportResult.rowCount).toBeGreaterThan(0);
    expect(exportResult.csvContent).toContain("Receipt Number,Case Number");

    // Verify entry in export_logs table under user context (due to RLS)
    const log = await withUserContext(financeAdminId, async (tx) => {
      return await tx.exportLog.findFirst({
        where: { userId: financeAdminId, exportType: "PAYMENTS" },
        orderBy: { createdAt: "desc" },
      });
    });

    expect(log).toBeDefined();
    expect(log?.rowCount).toBe(exportResult.rowCount);
  });

  it("enforces RLS: unassigned lawyer Alpha cannot view fee/payments for restricted case", async () => {
    // Lawyer Alpha is NOT assigned to restricted case CS-202/2026
    const res = await withUserContext(lawyerAlphaId, async (tx) => {
      return await tx.payment.findMany({
        where: { caseId: restrictedCaseId },
      });
    });

    // RLS must return 0 rows
    expect(res.length).toBe(0);
  });

  afterAll(async () => {
    const ownerUrl =
      process.env.SEED_DATABASE_URL ||
      "postgresql://lms_owner:lms_dev_password@localhost:5432/lms_dev?schema=public";
    const ownerPrisma = new PrismaClient({ datasources: { db: { url: ownerUrl } } });
    await ownerPrisma.case.deleteMany({
      where: { caseNumber: { startsWith: "FIN-TEST-" } },
    });
    await ownerPrisma.$disconnect();
  });
});
