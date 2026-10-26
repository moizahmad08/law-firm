import { withUserContext } from "@/lib/database/context";
import { recordAuthAudit } from "@/lib/auth/audit";
import {
  InstallmentStatus,
  PaymentMethod,
  ExpenseCategory,
  ExpenseStatus,
  Prisma,
} from "@prisma/client";

export interface CreateCaseFeeInput {
  caseId: string;
  agreedFee: number;
  currency?: string;
  notes?: string;
  agreedById: string;
  installments?: Array<{
    amount: number;
    dueDate: Date | string;
  }>;
}

export interface RecordPaymentInput {
  caseId: string;
  installmentId?: string | null;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate?: Date | string;
  referenceNumber?: string | null;
  notes?: string | null;
  receivedById: string;
}

export interface ReversePaymentInput {
  paymentId: string;
  reversalReason: string;
  userId: string;
}

export interface RecordExpenseInput {
  caseId: string;
  category: ExpenseCategory;
  amount: number;
  expenseDate?: Date | string;
  isBillableToClient?: boolean;
  notes?: string | null;
  receiptPath?: string | null;
  incurredById: string;
}

export interface UpdateExpenseStatusInput {
  expenseId: string;
  status: ExpenseStatus;
  userId: string;
}

/**
 * Creates or updates a fee agreement for a case, with scheduled installments.
 */
export async function createCaseFee(input: CreateCaseFeeInput) {
  if (input.agreedFee < 0) {
    throw new Error("Agreed fee cannot be negative.");
  }

  return await withUserContext(input.agreedById, async (tx) => {
    // Check if fee already exists for this case
    const existingFee = await tx.caseFee.findUnique({
      where: { caseId: input.caseId },
      include: { installments: true },
    });

    if (existingFee) {
      throw new Error("A fee agreement already exists for this case. Update or add installments instead.");
    }

    const fee = await tx.caseFee.create({
      data: {
        caseId: input.caseId,
        agreedFee: new Prisma.Decimal(input.agreedFee),
        currency: input.currency || "PKR",
        notes: input.notes?.trim() || null,
        agreedById: input.agreedById,
      },
    });

    // Create installments if provided
    if (input.installments && input.installments.length > 0) {
      let instNum = 1;
      for (const inst of input.installments) {
        if (inst.amount <= 0) {
          throw new Error(`Installment ${instNum} amount must be greater than zero.`);
        }
        const dueDate = new Date(inst.dueDate);
        if (isNaN(dueDate.getTime())) {
          throw new Error(`Installment ${instNum} has an invalid due date.`);
        }

        await tx.feeInstallment.create({
          data: {
            feeId: fee.id,
            installmentNumber: instNum++,
            amount: new Prisma.Decimal(inst.amount),
            dueDate,
            status: InstallmentStatus.PENDING,
          },
        });
      }
    }

    await recordAuthAudit({
      userId: input.agreedById,
      action: "FEE_AGREEMENT_CREATED",
      metadata: {
        feeId: fee.id,
        caseId: input.caseId,
        agreedFee: input.agreedFee,
        currency: input.currency || "PKR",
        installmentCount: input.installments?.length || 0,
      },
    });

    return await tx.caseFee.findUniqueOrThrow({
      where: { id: fee.id },
      include: {
        installments: {
          orderBy: { installmentNumber: "asc" },
        },
      },
    });
  });
}

/**
 * Records an immutable payment, generates sequential receipt number (RCP-YYYY-XXXX),
 * and reconciles against case installments.
 */
export async function recordPayment(input: RecordPaymentInput) {
  if (input.amount <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  const paymentDate = input.paymentDate ? new Date(input.paymentDate) : new Date();
  if (isNaN(paymentDate.getTime())) {
    throw new Error("Invalid payment date provided.");
  }

  return await withUserContext(input.receivedById, async (tx) => {
    // 1. Generate sequential receipt number: RCP-YYYY-XXXX
    const currentYear = paymentDate.getFullYear();
    const prefix = `RCP-${currentYear}-`;

    // Lock and get latest receipt number for current year
    const latestPayments: Array<{ receipt_number: string }> = await tx.$queryRaw`
      SELECT receipt_number FROM payments 
      WHERE receipt_number LIKE ${prefix + "%"} 
      ORDER BY receipt_number DESC 
      LIMIT 1 
      FOR UPDATE
    `;

    let nextSeq = 1;
    if (latestPayments.length > 0) {
      const match = latestPayments[0].receipt_number.match(/RCP-\d{4}-(\d+)/);
      if (match) {
        nextSeq = parseInt(match[1], 10) + 1;
      }
    }
    const receiptNumber = `${prefix}${String(nextSeq).padStart(4, "0")}`;

    // 2. Determine target installment
    let targetInstallmentId = input.installmentId || null;

    if (!targetInstallmentId) {
      // FIFO: find earliest unpaid or partially paid installment for this case's fee
      const fee = await tx.caseFee.findUnique({
        where: { caseId: input.caseId },
        include: {
          installments: {
            where: {
              status: { in: [InstallmentStatus.PENDING, InstallmentStatus.PARTIALLY_PAID, InstallmentStatus.OVERDUE] },
            },
            orderBy: { installmentNumber: "asc" },
          },
        },
      });

      if (fee && fee.installments.length > 0) {
        targetInstallmentId = fee.installments[0].id;
      }
    }

    // 3. Create payment record
    const payment = await tx.payment.create({
      data: {
        caseId: input.caseId,
        installmentId: targetInstallmentId,
        receiptNumber,
        amount: new Prisma.Decimal(input.amount),
        paymentMethod: input.paymentMethod,
        paymentDate,
        referenceNumber: input.referenceNumber?.trim() || null,
        notes: input.notes?.trim() || null,
        receivedById: input.receivedById,
      },
      include: {
        case: {
          select: { id: true, caseNumber: true, title: true },
        },
        installment: true,
      },
    });

    // 4. Reconcile installment status if linked
    if (targetInstallmentId) {
      await reconcileInstallmentStatus(tx, targetInstallmentId);
    }

    // 5. Audit log
    await recordAuthAudit({
      userId: input.receivedById,
      action: "PAYMENT_RECORDED",
      metadata: {
        paymentId: payment.id,
        receiptNumber: payment.receiptNumber,
        caseId: input.caseId,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        installmentId: targetInstallmentId,
      },
    });

    return payment;
  });
}

/**
 * Reverses an erroneous payment with an audit trail and reason.
 * Strictly preserves accounting history (NEVER deletes).
 */
export async function reversePayment(input: ReversePaymentInput) {
  const reason = input.reversalReason?.trim();
  if (!reason || reason.length < 5) {
    throw new Error("A comprehensive reversal reason (at least 5 characters) is required.");
  }

  return await withUserContext(input.userId, async (tx) => {
    const payment = await tx.payment.findUniqueOrThrow({
      where: { id: input.paymentId },
      include: { installment: true },
    });

    if (payment.isReversed) {
      throw new Error(`Payment ${payment.receiptNumber} has already been reversed.`);
    }

    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        isReversed: true,
        reversalReason: reason,
        reversedAt: new Date(),
        reversedById: input.userId,
      },
      include: {
        case: { select: { id: true, caseNumber: true, title: true } },
        reversedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    // Reconcile installment status after reversal
    if (payment.installmentId) {
      await reconcileInstallmentStatus(tx, payment.installmentId);
    }

    await recordAuthAudit({
      userId: input.userId,
      action: "PAYMENT_REVERSED",
      metadata: {
        paymentId: payment.id,
        receiptNumber: payment.receiptNumber,
        caseId: payment.caseId,
        amount: Number(payment.amount),
        reversalReason: reason,
      },
    });

    return updatedPayment;
  });
}

/**
 * Records an expense incurred for a case (court fees, stamp papers, travel, etc.).
 */
export async function recordExpense(input: RecordExpenseInput) {
  if (input.amount <= 0) {
    throw new Error("Expense amount must be greater than zero.");
  }

  const expenseDate = input.expenseDate ? new Date(input.expenseDate) : new Date();
  if (isNaN(expenseDate.getTime())) {
    throw new Error("Invalid expense date provided.");
  }

  return await withUserContext(input.incurredById, async (tx) => {
    const expense = await tx.expense.create({
      data: {
        caseId: input.caseId,
        category: input.category,
        amount: new Prisma.Decimal(input.amount),
        expenseDate,
        isBillableToClient: input.isBillableToClient ?? true,
        notes: input.notes?.trim() || null,
        receiptPath: input.receiptPath || null,
        incurredById: input.incurredById,
        paymentStatus: ExpenseStatus.OUTSTANDING,
      },
      include: {
        case: { select: { id: true, caseNumber: true, title: true } },
        incurredBy: { select: { id: true, fullName: true } },
      },
    });

    await recordAuthAudit({
      userId: input.incurredById,
      action: "EXPENSE_RECORDED",
      metadata: {
        expenseId: expense.id,
        caseId: input.caseId,
        category: input.category,
        amount: input.amount,
        isBillable: expense.isBillableToClient,
      },
    });

    return expense;
  });
}

/**
 * Updates expense status (e.g. approved, reimbursed, paid).
 */
export async function updateExpenseStatus(input: UpdateExpenseStatusInput) {
  return await withUserContext(input.userId, async (tx) => {
    const expense = await tx.expense.findUniqueOrThrow({
      where: { id: input.expenseId },
    });

    const updated = await tx.expense.update({
      where: { id: input.expenseId },
      data: { paymentStatus: input.status },
      include: {
        case: { select: { id: true, caseNumber: true, title: true } },
      },
    });

    await recordAuthAudit({
      userId: input.userId,
      action: "EXPENSE_STATUS_UPDATED",
      metadata: {
        expenseId: expense.id,
        oldStatus: expense.paymentStatus,
        newStatus: input.status,
      },
    });

    return updated;
  });
}

/**
 * Returns comprehensive financial summary for a specific case:
 * fee agreed, installments breakdown, valid payments, reversed payments,
 * outstanding balance, and expense ledger.
 */
export async function getCaseFinancialSummary(caseId: string, userId: string) {
  return await withUserContext(userId, async (tx) => {
    const fee = await tx.caseFee.findUnique({
      where: { caseId },
      include: {
        installments: {
          orderBy: { installmentNumber: "asc" },
        },
      },
    });

    const payments = await tx.payment.findMany({
      where: { caseId },
      orderBy: { paymentDate: "desc" },
      include: {
        receivedBy: { select: { id: true, fullName: true } },
        reversedBy: { select: { id: true, fullName: true } },
        installment: true,
      },
    });

    const expenses = await tx.expense.findMany({
      where: { caseId },
      orderBy: { expenseDate: "desc" },
      include: {
        incurredBy: { select: { id: true, fullName: true } },
      },
    });

    const agreedFee = fee ? Number(fee.agreedFee) : 0;
    const activePayments = payments.filter((p) => !p.isReversed);
    const reversedPayments = payments.filter((p) => p.isReversed);

    const totalPaid = activePayments.reduce((acc, p) => acc + Number(p.amount), 0);
    const outstandingBalance = Math.max(0, agreedFee - totalPaid);

    const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount), 0);
    const billableExpenses = expenses
      .filter((e) => e.isBillableToClient)
      .reduce((acc, e) => acc + Number(e.amount), 0);

    return {
      fee,
      installments: fee?.installments || [],
      payments,
      activePayments,
      reversedPayments,
      expenses,
      agreedFee,
      totalPaid,
      outstandingBalance,
      totalExpenses,
      billableExpenses,
    };
  });
}

/**
 * Helper to reconcile an installment's status based on valid unreversed payments.
 */
async function reconcileInstallmentStatus(tx: Prisma.TransactionClient, installmentId: string) {
  const installment = await tx.feeInstallment.findUnique({
    where: { id: installmentId },
  });

  if (!installment) return;

  const validPayments = await tx.payment.findMany({
    where: {
      installmentId,
      isReversed: false,
    },
  });

  const totalPaid = validPayments.reduce((acc, p) => acc + Number(p.amount), 0);
  const targetAmount = Number(installment.amount);
  const now = new Date();

  let newStatus: InstallmentStatus = InstallmentStatus.PENDING;
  let paidAt: Date | null = null;

  if (totalPaid >= targetAmount) {
    newStatus = InstallmentStatus.PAID;
    paidAt = validPayments[validPayments.length - 1]?.paymentDate || now;
  } else if (totalPaid > 0) {
    newStatus = InstallmentStatus.PARTIALLY_PAID;
  } else {
    // If overdue
    if (new Date(installment.dueDate) < now) {
      newStatus = InstallmentStatus.OVERDUE;
    } else {
      newStatus = InstallmentStatus.PENDING;
    }
  }

  await tx.feeInstallment.update({
    where: { id: installmentId },
    data: {
      status: newStatus,
      paidAt,
    },
  });
}
