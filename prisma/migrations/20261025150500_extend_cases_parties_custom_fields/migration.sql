-- Milestone 2A: Extended Schema & Master Data Migration
-- Courts, Benches, Judges, Parties, Custom Fields, Conflict Checks, Break-Glass & pg_trgm

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "PartyRole" AS ENUM (
  'PETITIONER',
  'APPELLANT',
  'PLAINTIFF',
  'RESPONDENT',
  'DEFENDANT',
  'PROFORMA_RESPONDENT',
  'OPPOSING_COUNSEL',
  'CO_COUNSEL'
);

-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM (
  'TEXT',
  'NUMBER',
  'DATE',
  'BOOLEAN',
  'SELECT'
);

-- CreateEnum
CREATE TYPE "BreakGlassStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'EXPIRED',
  'REVOKED'
);

-- AlterTable cases
ALTER TABLE "cases"
  ADD COLUMN IF NOT EXISTS "court_id" UUID,
  ADD COLUMN IF NOT EXISTS "bench_id" UUID;

-- CreateTable courts
CREATE TABLE "courts" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "courts_pkey" PRIMARY KEY ("id")
);

-- CreateTable benches
CREATE TABLE "benches" (
    "id" UUID NOT NULL,
    "court_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "benches_pkey" PRIMARY KEY ("id")
);

-- CreateTable judges
CREATE TABLE "judges" (
    "id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "court_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "judges_pkey" PRIMARY KEY ("id")
);

-- CreateTable case_parties
CREATE TABLE "case_parties" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "party_role" "PartyRole" NOT NULL,
    "name" TEXT NOT NULL,
    "cnic" TEXT,
    "contact_number" TEXT,
    "email" TEXT,
    "address" TEXT,
    "advocate_name" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "case_parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable related_cases
CREATE TABLE "related_cases" (
    "id" UUID NOT NULL,
    "primary_case_id" UUID NOT NULL,
    "related_case_id" UUID NOT NULL,
    "relationship_type" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "related_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable custom_field_definitions
CREATE TABLE "custom_field_definitions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "field_type" "CustomFieldType" NOT NULL,
    "case_type" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "options_json" JSONB,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "custom_field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable custom_field_values
CREATE TABLE "custom_field_values" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "field_definition_id" UUID NOT NULL,
    "value_text" TEXT,
    "value_number" DOUBLE PRECISION,
    "value_date" DATE,
    "value_boolean" BOOLEAN,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "custom_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable conflict_check_records
CREATE TABLE "conflict_check_records" (
    "id" UUID NOT NULL,
    "queried_by_name" TEXT NOT NULL,
    "queried_by_user_id" UUID,
    "queried_party_name" TEXT NOT NULL,
    "queried_cnic" TEXT,
    "match_found" BOOLEAN NOT NULL DEFAULT false,
    "matched_details" JSONB,
    "is_cleared" BOOLEAN NOT NULL DEFAULT false,
    "cleared_by_user_id" UUID,
    "cleared_at" TIMESTAMPTZ(6),
    "clearance_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conflict_check_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable break_glass_requests
CREATE TABLE "break_glass_requests" (
    "id" UUID NOT NULL,
    "requested_by_user_id" UUID NOT NULL,
    "target_case_id" UUID NOT NULL,
    "justification" TEXT NOT NULL,
    "status" "BreakGlassStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by_user_id" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "break_glass_requests_pkey" PRIMARY KEY ("id")
);

-- Create Unique & Standard Indexes
CREATE UNIQUE INDEX "courts_code_key" ON "courts"("code");
CREATE UNIQUE INDEX "benches_court_id_code_key" ON "benches"("court_id", "code");
CREATE INDEX "case_parties_case_id_idx" ON "case_parties"("case_id");
CREATE INDEX "case_parties_name_idx" ON "case_parties"("name");
CREATE INDEX "case_parties_cnic_idx" ON "case_parties"("cnic");
CREATE UNIQUE INDEX "related_cases_primary_case_id_related_case_id_key" ON "related_cases"("primary_case_id", "related_case_id");
CREATE UNIQUE INDEX "custom_field_definitions_code_key" ON "custom_field_definitions"("code");
CREATE INDEX "custom_field_values_case_id_idx" ON "custom_field_values"("case_id");
CREATE UNIQUE INDEX "custom_field_values_case_id_field_definition_id_key" ON "custom_field_values"("case_id", "field_definition_id");
CREATE INDEX "conflict_check_records_queried_party_name_idx" ON "conflict_check_records"("queried_party_name");
CREATE INDEX "conflict_check_records_created_at_idx" ON "conflict_check_records"("created_at");
CREATE INDEX "break_glass_requests_requested_by_user_id_idx" ON "break_glass_requests"("requested_by_user_id");
CREATE INDEX "break_glass_requests_target_case_id_idx" ON "break_glass_requests"("target_case_id");
CREATE INDEX "cases_court_id_idx" ON "cases"("court_id");

-- Trigram Indexes for Fast, Scalable Similarity & Search
CREATE INDEX IF NOT EXISTS "cases_title_trgm_idx" ON "cases" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "cases_number_trgm_idx" ON "cases" USING gin ("case_number" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "case_parties_name_trgm_idx" ON "case_parties" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "clients_name_trgm_idx" ON "clients" USING gin ("name" gin_trgm_ops);

-- Add Foreign Keys
ALTER TABLE "benches" ADD CONSTRAINT "benches_court_id_fkey" FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cases" ADD CONSTRAINT "cases_court_id_fkey" FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cases" ADD CONSTRAINT "cases_bench_id_fkey" FOREIGN KEY ("bench_id") REFERENCES "benches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "case_parties" ADD CONSTRAINT "case_parties_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "related_cases" ADD CONSTRAINT "related_cases_primary_case_id_fkey" FOREIGN KEY ("primary_case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "related_cases" ADD CONSTRAINT "related_cases_related_case_id_fkey" FOREIGN KEY ("related_case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_field_definition_id_fkey" FOREIGN KEY ("field_definition_id") REFERENCES "custom_field_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "break_glass_requests" ADD CONSTRAINT "break_glass_requests_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "break_glass_requests" ADD CONSTRAINT "break_glass_requests_target_case_id_fkey" FOREIGN KEY ("target_case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "break_glass_requests" ADD CONSTRAINT "break_glass_requests_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- Row-Level Security (RLS) Configuration on New Tables
-- ============================================================

ALTER TABLE public.case_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_parties FORCE ROW LEVEL SECURITY;

ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_values FORCE ROW LEVEL SECURITY;

ALTER TABLE public.related_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.related_cases FORCE ROW LEVEL SECURITY;

ALTER TABLE public.break_glass_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.break_glass_requests FORCE ROW LEVEL SECURITY;

ALTER TABLE public.conflict_check_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conflict_check_records FORCE ROW LEVEL SECURITY;

-- 1. case_parties RLS policies (follows case-level visibility and ethical wall)
DROP POLICY IF EXISTS case_parties_select_policy ON public.case_parties;
CREATE POLICY case_parties_select_policy ON public.case_parties
FOR SELECT
USING (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = case_parties.case_id
      AND (
        (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
      )
  )
);

DROP POLICY IF EXISTS case_parties_write_policy ON public.case_parties;
CREATE POLICY case_parties_write_policy ON public.case_parties
FOR ALL
USING (
  public.current_app_user_id() IS NOT NULL
  AND (
    public.current_app_user_role() = 'OFFICE_ADMIN'
    OR public.is_user_assigned_to_case(case_parties.case_id, public.current_app_user_id())
  )
);

-- 2. custom_field_values RLS policies
DROP POLICY IF EXISTS custom_field_values_select_policy ON public.custom_field_values;
CREATE POLICY custom_field_values_select_policy ON public.custom_field_values
FOR SELECT
USING (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = custom_field_values.case_id
      AND (
        (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
      )
  )
);

DROP POLICY IF EXISTS custom_field_values_write_policy ON public.custom_field_values;
CREATE POLICY custom_field_values_write_policy ON public.custom_field_values
FOR ALL
USING (
  public.current_app_user_id() IS NOT NULL
  AND (
    public.current_app_user_role() = 'OFFICE_ADMIN'
    OR public.is_user_assigned_to_case(custom_field_values.case_id, public.current_app_user_id())
  )
);

-- 3. related_cases RLS policies
DROP POLICY IF EXISTS related_cases_select_policy ON public.related_cases;
CREATE POLICY related_cases_select_policy ON public.related_cases
FOR SELECT
USING (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = related_cases.primary_case_id
      AND (
        (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
      )
  )
);

-- 4. break_glass_requests RLS policies
DROP POLICY IF EXISTS break_glass_select_policy ON public.break_glass_requests;
CREATE POLICY break_glass_select_policy ON public.break_glass_requests
FOR SELECT
USING (
  public.current_app_user_id() IS NOT NULL
  AND (
    requested_by_user_id = public.current_app_user_id()
    OR public.current_app_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN')
  )
);

DROP POLICY IF EXISTS break_glass_insert_policy ON public.break_glass_requests;
CREATE POLICY break_glass_insert_policy ON public.break_glass_requests
FOR INSERT
WITH CHECK (
  public.current_app_user_id() IS NOT NULL
  AND public.current_app_user_role() = 'SUPER_ADMIN'
);

DROP POLICY IF EXISTS break_glass_update_policy ON public.break_glass_requests;
CREATE POLICY break_glass_update_policy ON public.break_glass_requests
FOR UPDATE
USING (
  public.current_app_user_id() IS NOT NULL
  AND public.current_app_user_role() = 'OFFICE_ADMIN'
);

-- 5. conflict_check_records RLS policies
DROP POLICY IF EXISTS conflict_check_select_policy ON public.conflict_check_records;
CREATE POLICY conflict_check_select_policy ON public.conflict_check_records
FOR SELECT
USING (true);

DROP POLICY IF EXISTS conflict_check_insert_policy ON public.conflict_check_records;
CREATE POLICY conflict_check_insert_policy ON public.conflict_check_records
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS conflict_check_update_policy ON public.conflict_check_records;
CREATE POLICY conflict_check_update_policy ON public.conflict_check_records
FOR UPDATE
USING (
  public.current_app_user_id() IS NOT NULL
  AND public.current_app_user_role() IN ('OFFICE_ADMIN', 'LAWYER')
);

-- ============================================================
-- Permissions Grants for Restricted Application Role (lms_app)
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.courts TO lms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.benches TO lms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.judges TO lms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_parties TO lms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.related_cases TO lms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_field_definitions TO lms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_field_values TO lms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conflict_check_records TO lms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.break_glass_requests TO lms_app;
