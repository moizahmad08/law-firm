import { withUserContext } from "@/lib/database/context";
import { InstallmentStatus } from "@prisma/client";

export interface AgingBucket {
  current: number; // Not yet due
  days1_30: number; // 1 to 30 days overdue
  days31_60: number; // 31 to 60 days overdue
  days61_90: number; // 61 to 90 days overdue
  days90Plus: number; // >90 days overdue
  totalOverdue: number;
}

export interface FinancialOverviewReport {
  totalAgreed: number;
  totalCollected: number;
  totalOutstanding: number;
  collectionRatePercent: number;
  aging: AgingBucket;
  totalExpenses: number;
  billableExpenses: number;
  recentPayments: Array<{
    id: string;
    receiptNumber: string;
    caseNumber: string;
    caseTitle: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    receivedBy: string;
  }>;
  caseLedgers: Array<{
    caseId: string;
    caseNumber: string;
    caseTitle: string;
    clientName: string;
    agreedFee: number;
    totalPaid: number;
    balance: number;
    status: string;
  }>;
}

/**
 * Computes comprehensive financial overview within user context (enforcing RLS).
 */
export async function getFinancialOverview(userId: string): Promise<FinancialOverviewReport> {
  return await withUserContext(userId, async (tx) => {
    // 1. Get all accessible cases
    const cases = await tx.case.findMany({
      include: {
        client: { select: { name: true } },
        status: { select: { code: true } },
        fee: {
          include: {
            installments: true,
          },
        },
      },
    });

    const caseIds = cases.map((c) => c.id);

    // 2. Get all payments for accessible cases
    const payments = await tx.payment.findMany({
      where: {
        caseId: { in: caseIds },
        isReversed: false,
      },
      include: {
        case: { select: { id: true, caseNumber: true, title: true } },
        receivedBy: { select: { fullName: true } },
      },
      orderBy: { paymentDate: "desc" },
    });

    // 3. Get all expenses for accessible cases
    const expenses = await tx.expense.findMany({
      where: { caseId: { in: caseIds } },
    });

    // Calculations
    let totalAgreed = 0;
    const caseLedgers: FinancialOverviewReport["caseLedgers"] = [];

    // Map payments per case
    const casePaymentsMap = new Map<string, number>();
    for (const p of payments) {
      const current = casePaymentsMap.get(p.caseId) || 0;
      casePaymentsMap.set(p.caseId, current + Number(p.amount));
    }

    const now = new Date();
    const aging: AgingBucket = {
      current: 0,
      days1_30: 0,
      days31_60: 0,
      days61_90: 0,
      days90Plus: 0,
      totalOverdue: 0,
    };

    // Calculate fees and aging from installments
    for (const c of cases) {
      const agreed = c.fee ? Number(c.fee.agreedFee) : 0;
      totalAgreed += agreed;
      const paid = casePaymentsMap.get(c.id) || 0;
      const balance = Math.max(0, agreed - paid);

      caseLedgers.push({
        caseId: c.id,
        caseNumber: c.caseNumber,
        caseTitle: c.title,
        clientName: c.client?.name || "Unknown",
        agreedFee: agreed,
        totalPaid: paid,
        balance,
        status: c.status?.code || "ACTIVE",
      });

      if (c.fee?.installments) {
        for (const inst of c.fee.installments) {
          if (inst.status !== InstallmentStatus.PAID) {
            const instAmount = Number(inst.amount);
            const dueDate = new Date(inst.dueDate);
            const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays <= 0) {
              aging.current += instAmount;
            } else if (diffDays <= 30) {
              aging.days1_30 += instAmount;
              aging.totalOverdue += instAmount;
            } else if (diffDays <= 60) {
              aging.days31_60 += instAmount;
              aging.totalOverdue += instAmount;
            } else if (diffDays <= 90) {
              aging.days61_90 += instAmount;
              aging.totalOverdue += instAmount;
            } else {
              aging.days90Plus += instAmount;
              aging.totalOverdue += instAmount;
            }
          }
        }
      }
    }

    const totalCollected = payments.reduce((acc, p) => acc + Number(p.amount), 0);
    const totalOutstanding = Math.max(0, totalAgreed - totalCollected);
    const collectionRatePercent = totalAgreed > 0 ? Math.round((totalCollected / totalAgreed) * 100) : 0;

    const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount), 0);
    const billableExpenses = expenses
      .filter((e) => e.isBillableToClient)
      .reduce((acc, e) => acc + Number(e.amount), 0);

    const recentPayments = payments.slice(0, 10).map((p) => ({
      id: p.id,
      receiptNumber: p.receiptNumber,
      caseNumber: p.case.caseNumber,
      caseTitle: p.case.title,
      amount: Number(p.amount),
      paymentDate: p.paymentDate.toISOString().split("T")[0],
      paymentMethod: p.paymentMethod,
      receivedBy: p.receivedBy.fullName,
    }));

    return {
      totalAgreed,
      totalCollected,
      totalOutstanding,
      collectionRatePercent,
      aging,
      totalExpenses,
      billableExpenses,
      recentPayments,
      caseLedgers,
    };
  });
}
