-- Milestone 4A: Financial Model, Payments, Expenses, Numbered Receipts & RLS

-- CreateEnum InstallmentStatus
CREATE TYPE "InstallmentStatus" AS ENUM ('PENDING', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'WAIVED');

-- CreateEnum PaymentMethod
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'CHEQUE', 'CASH', 'ONLINE');

-- CreateEnum ExpenseCategory
CREATE TYPE "ExpenseCategory" AS ENUM ('COURT_FEE', 'STAMP_PAPER', 'PROCESS_SERVING', 'TRAVEL', 'COPIES_TRANSCRIPTS', 'OTHER');

-- CreateEnum ExpenseStatus
CREATE TYPE "ExpenseStatus" AS ENUM ('OUTSTANDING', 'PAID', 'REIMBURSED');

-- CreateEnum JobStatus
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable case_fees
CREATE TABLE "case_fees" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "agreed_fee" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "notes" TEXT,
    "agreed_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "case_fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable fee_installments
CREATE TABLE "fee_installments" (
    "id" UUID NOT NULL,
    "fee_id" UUID NOT NULL,
    "installment_number" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "due_date" DATE NOT NULL,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "fee_installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable payments
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "installment_id" UUID,
    "receipt_number" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    "payment_date" DATE NOT NULL,
    "reference_number" TEXT,
    "notes" TEXT,
    "received_by_id" UUID NOT NULL,
    "is_reversed" BOOLEAN NOT NULL DEFAULT false,
    "reversal_reason" TEXT,
    "reversed_at" TIMESTAMPTZ(6),
    "reversed_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable expenses
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "amount" DECIMAL(12,2) NOT NULL,
    "expense_date" DATE NOT NULL,
    "is_billable_to_client" BOOLEAN NOT NULL DEFAULT true,
    "payment_status" "ExpenseStatus" NOT NULL DEFAULT 'OUTSTANDING',
    "receipt_path" TEXT,
    "notes" TEXT,
    "incurred_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable export_logs
CREATE TABLE "export_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "export_type" TEXT NOT NULL,
    "file_format" TEXT NOT NULL,
    "filters_json" JSONB,
    "row_count" INTEGER NOT NULL,
    "ip_address" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "export_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable job_queue
CREATE TABLE "job_queue" (
    "id" UUID NOT NULL,
    "job_type" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "last_error" TEXT,
    "run_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "job_queue_pkey" PRIMARY KEY ("id")
);

-- Create Indexes
CREATE UNIQUE INDEX "case_fees_case_id_key" ON "case_fees"("case_id");
CREATE INDEX "fee_installments_due_date_idx" ON "fee_installments"("due_date");
CREATE UNIQUE INDEX "fee_installments_fee_id_installment_number_key" ON "fee_installments"("fee_id", "installment_number");
CREATE UNIQUE INDEX "payments_receipt_number_key" ON "payments"("receipt_number");
CREATE INDEX "payments_case_id_idx" ON "payments"("case_id");
CREATE INDEX "payments_receipt_number_idx" ON "payments"("receipt_number");
CREATE INDEX "payments_payment_date_idx" ON "payments"("payment_date");
CREATE INDEX "expenses_case_id_idx" ON "expenses"("case_id");
CREATE INDEX "expenses_category_idx" ON "expenses"("category");
CREATE INDEX "export_logs_user_id_idx" ON "export_logs"("user_id");
CREATE INDEX "export_logs_export_type_idx" ON "export_logs"("export_type");
CREATE UNIQUE INDEX "job_queue_idempotency_key_key" ON "job_queue"("idempotency_key");
CREATE INDEX "job_queue_status_run_at_idx" ON "job_queue"("status", "run_at");

-- Add Foreign Keys
ALTER TABLE "case_fees" ADD CONSTRAINT "case_fees_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "case_fees" ADD CONSTRAINT "case_fees_agreed_by_id_fkey" FOREIGN KEY ("agreed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fee_installments" ADD CONSTRAINT "fee_installments_fee_id_fkey" FOREIGN KEY ("fee_id") REFERENCES "case_fees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_installment_id_fkey" FOREIGN KEY ("installment_id") REFERENCES "fee_installments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_received_by_id_fkey" FOREIGN KEY ("received_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_reversed_by_id_fkey" FOREIGN KEY ("reversed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_incurred_by_id_fkey" FOREIGN KEY ("incurred_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "export_logs" ADD CONSTRAINT "export_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- Enable and FORCE Row-Level Security on Milestone 4 tables
-- ============================================================

ALTER TABLE public.case_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_fees FORCE ROW LEVEL SECURITY;

ALTER TABLE public.fee_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_installments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses FORCE ROW LEVEL SECURITY;

ALTER TABLE public.export_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_logs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_queue FORCE ROW LEVEL SECURITY;

-- ============================================================
-- 1. case_fees RLS Policies
-- ============================================================

DROP POLICY IF EXISTS case_fees_select_policy ON public.case_fees;
CREATE POLICY case_fees_select_policy ON public.case_fees
FOR SELECT
USING (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = case_fees.case_id
      AND (
        (public.current_app_user_role() IN ('OFFICE_ADMIN', 'FINANCE_ADMIN') AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
        OR (public.current_app_user_role() = 'SUPER_ADMIN' AND public.has_active_break_glass(c.id, public.current_app_user_id()))
      )
  )
);

DROP POLICY IF EXISTS case_fees_insert_policy ON public.case_fees;
CREATE POLICY case_fees_insert_policy ON public.case_fees
FOR INSERT
WITH CHECK (
  public.current_app_user_id() IS NOT NULL
  AND public.current_app_user_role() IN ('OFFICE_ADMIN', 'FINANCE_ADMIN')
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = case_fees.case_id
      AND (
        (public.current_app_user_role() IN ('OFFICE_ADMIN', 'FINANCE_ADMIN') AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
      )
  )
);

DROP POLICY IF EXISTS case_fees_update_policy ON public.case_fees;
CREATE POLICY case_fees_update_policy ON public.case_fees
FOR UPDATE
USING (
  public.current_app_user_id() IS NOT NULL
  AND public.current_app_user_role() IN ('OFFICE_ADMIN', 'FINANCE_ADMIN')
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = case_fees.case_id
      AND (
        (public.current_app_user_role() IN ('OFFICE_ADMIN', 'FINANCE_ADMIN') AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
      )
  )
);

-- ============================================================
-- 2. fee_installments RLS Policies
-- ============================================================

DROP POLICY IF EXISTS fee_installments_select_policy ON public.fee_installments;
CREATE POLICY fee_installments_select_policy ON public.fee_installments
FOR SELECT
USING (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.case_fees cf
    JOIN public.cases c ON c.id = cf.case_id
    WHERE cf.id = fee_installments.fee_id
      AND (
        (public.current_app_user_role() IN ('OFFICE_ADMIN', 'FINANCE_ADMIN') AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
        OR (public.current_app_user_role() = 'SUPER_ADMIN' AND public.has_active_break_glass(c.id, public.current_app_user_id()))
      )
  )
);

DROP POLICY IF EXISTS fee_installments_insert_policy ON public.fee_installments;
CREATE POLICY fee_installments_insert_policy ON public.fee_installments
FOR INSERT
WITH CHECK (
  public.current_app_user_id() IS NOT NULL
  AND public.current_app_user_role() IN ('OFFICE_ADMIN', 'FINANCE_ADMIN')
);

DROP POLICY IF EXISTS fee_installments_update_policy ON public.fee_installments;
CREATE POLICY fee_installments_update_policy ON public.fee_installments
FOR UPDATE
USING (
  public.current_app_user_id() IS NOT NULL
  AND public.current_app_user_role() IN ('OFFICE_ADMIN', 'FINANCE_ADMIN')
);

-- ============================================================
-- 3. payments RLS Policies (NO DELETE ALLOWED - IMMUTABLE WITH REVERSAL)
-- ============================================================

DROP POLICY IF EXISTS payments_select_policy ON public.payments;
CREATE POLICY payments_select_policy ON public.payments
FOR SELECT
USING (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = payments.case_id
      AND (
        (public.current_app_user_role() IN ('OFFICE_ADMIN', 'FINANCE_ADMIN') AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
        OR (public.current_app_user_role() = 'SUPER_ADMIN' AND public.has_active_break_glass(c.id, public.current_app_user_id()))
      )
  )
);

DROP POLICY IF EXISTS payments_insert_policy ON public.payments;
CREATE POLICY payments_insert_policy ON public.payments
FOR INSERT
WITH CHECK (
  public.current_app_user_id() IS NOT NULL
  AND public.current_app_user_role() IN ('OFFICE_ADMIN', 'FINANCE_ADMIN')
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = payments.case_id
      AND (
        (public.current_app_user_role() IN ('OFFICE_ADMIN', 'FINANCE_ADMIN') AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
      )
  )
);

DROP POLICY IF EXISTS payments_update_policy ON public.payments;
CREATE POLICY payments_update_policy ON public.payments
FOR UPDATE
USING (
  public.current_app_user_id() IS NOT NULL
  AND public.current_app_user_role() IN ('OFFICE_ADMIN', 'FINANCE_ADMIN')
);

-- ============================================================
-- 4. expenses RLS Policies
-- ============================================================

DROP POLICY IF EXISTS expenses_select_policy ON public.expenses;
CREATE POLICY expenses_select_policy ON public.expenses
FOR SELECT
USING (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = expenses.case_id
      AND (
        (public.current_app_user_role() IN ('OFFICE_ADMIN', 'FINANCE_ADMIN') AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
        OR (public.current_app_user_role() = 'SUPER_ADMIN' AND public.has_active_break_glass(c.id, public.current_app_user_id()))
      )
  )
);

DROP POLICY IF EXISTS expenses_insert_policy ON public.expenses;
CREATE POLICY expenses_insert_policy ON public.expenses
FOR INSERT
WITH CHECK (
  public.current_app_user_id() IS NOT NULL
  AND public.current_app_user_role() IN ('OFFICE_ADMIN', 'FINANCE_ADMIN', 'LAWYER', 'ASSISTANT')
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = expenses.case_id
      AND (
        (public.current_app_user_role() IN ('OFFICE_ADMIN', 'FINANCE_ADMIN') AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
      )
  )
);

DROP POLICY IF EXISTS expenses_update_policy ON public.expenses;
CREATE POLICY expenses_update_policy ON public.expenses
FOR UPDATE
USING (
  public.current_app_user_id() IS NOT NULL
  AND public.current_app_user_role() IN ('OFFICE_ADMIN', 'FINANCE_ADMIN', 'LAWYER')
);

-- ============================================================
-- 5. export_logs RLS Policies
-- ============================================================

DROP POLICY IF EXISTS export_logs_select_policy ON public.export_logs;
CREATE POLICY export_logs_select_policy ON public.export_logs
FOR SELECT
USING (
  public.current_app_user_id() IS NOT NULL
  AND (
    user_id = public.current_app_user_id()
    OR public.current_app_user_role() IN ('OFFICE_ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN')
  )
);

DROP POLICY IF EXISTS export_logs_insert_policy ON public.export_logs;
CREATE POLICY export_logs_insert_policy ON public.export_logs
FOR INSERT
WITH CHECK (
  public.current_app_user_id() IS NOT NULL
);

-- ============================================================
-- 6. job_queue RLS Policies
-- ============================================================

DROP POLICY IF EXISTS job_queue_policy ON public.job_queue;
CREATE POLICY job_queue_policy ON public.job_queue
FOR ALL
USING (true)
WITH CHECK (true);

-- ============================================================
-- Role Grants for Restricted Runtime Role (lms_app)
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_fees TO lms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_installments TO lms_app;
GRANT SELECT, INSERT, UPDATE ON public.payments TO lms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO lms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.export_logs TO lms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_queue TO lms_app;
