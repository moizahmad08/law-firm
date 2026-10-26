-- Milestone 3A: Documents, Document Versions, Hearings & Tasks Schema with Row-Level Security

-- CreateEnum DocumentCategory
CREATE TYPE "DocumentCategory" AS ENUM ('COURT_ORDER', 'PLEADING', 'EVIDENCE', 'CONTRACT', 'CLIENT_DOC', 'CORRESPONDENCE', 'POWER_OF_ATTORNEY', 'OTHER');

-- CreateEnum ScanStatus
CREATE TYPE "ScanStatus" AS ENUM ('PENDING', 'CLEAN', 'INFECTED');

-- CreateEnum HearingStatus
CREATE TYPE "HearingStatus" AS ENUM ('SCHEDULED', 'HEARD', 'ADJOURNED', 'DECIDED', 'CANCELLED');

-- CreateEnum TaskPriority
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum TaskStatus
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'UNDER_REVIEW', 'COMPLETED', 'CANCELLED');

-- CreateTable documents
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "category" "DocumentCategory" NOT NULL DEFAULT 'OTHER',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "is_restricted" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" UUID NOT NULL,
    "current_version_number" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable document_versions
CREATE TABLE "document_versions" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_extension" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size_bytes" BIGINT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "file_hash_sha256" TEXT NOT NULL,
    "notes" TEXT,
    "scan_status" "ScanStatus" NOT NULL DEFAULT 'PENDING',
    "scanned_at" TIMESTAMPTZ(6),
    "uploader_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable hearings
CREATE TABLE "hearings" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "court" TEXT NOT NULL,
    "bench_id" UUID,
    "judge_id" UUID,
    "hearing_date" TIMESTAMPTZ(6) NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" "HearingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "outcome" TEXT,
    "next_date" TIMESTAMPTZ(6),
    "action_required" TEXT,
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "hearings_pkey" PRIMARY KEY ("id")
);

-- CreateTable tasks
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "case_id" UUID,
    "hearing_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "due_date" TIMESTAMPTZ(6),
    "completion_date" TIMESTAMPTZ(6),
    "assigned_to_user_id" UUID,
    "created_by_id" UUID NOT NULL,
    "escalated_to_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "row_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- Create Indexes
CREATE INDEX "documents_case_id_idx" ON "documents"("case_id");
CREATE INDEX "documents_category_idx" ON "documents"("category");
CREATE INDEX "document_versions_document_id_idx" ON "document_versions"("document_id");
CREATE INDEX "document_versions_file_hash_sha256_idx" ON "document_versions"("file_hash_sha256");
CREATE UNIQUE INDEX "document_versions_document_id_version_number_key" ON "document_versions"("document_id", "version_number");
CREATE INDEX "hearings_case_id_idx" ON "hearings"("case_id");
CREATE INDEX "hearings_hearing_date_idx" ON "hearings"("hearing_date");
CREATE INDEX "tasks_case_id_idx" ON "tasks"("case_id");
CREATE INDEX "tasks_assigned_to_user_id_idx" ON "tasks"("assigned_to_user_id");
CREATE INDEX "tasks_due_date_idx" ON "tasks"("due_date");

-- Add Foreign Keys
ALTER TABLE "documents" ADD CONSTRAINT "documents_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "hearings" ADD CONSTRAINT "hearings_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hearings" ADD CONSTRAINT "hearings_bench_id_fkey" FOREIGN KEY ("bench_id") REFERENCES "benches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "hearings" ADD CONSTRAINT "hearings_judge_id_fkey" FOREIGN KEY ("judge_id") REFERENCES "judges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "hearings" ADD CONSTRAINT "hearings_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_hearing_id_fkey" FOREIGN KEY ("hearing_id") REFERENCES "hearings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- Enable and FORCE Row-Level Security on Milestone 3 tables
-- ============================================================

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents FORCE ROW LEVEL SECURITY;

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.hearings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hearings FORCE ROW LEVEL SECURITY;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks FORCE ROW LEVEL SECURITY;

-- ============================================================
-- 1. documents RLS Policies
-- ============================================================

DROP POLICY IF EXISTS documents_select_policy ON public.documents;
CREATE POLICY documents_select_policy ON public.documents
FOR SELECT
USING (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = documents.case_id
      AND (
        (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false AND documents.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
        OR (public.current_app_user_role() = 'SUPER_ADMIN' AND public.has_active_break_glass(c.id, public.current_app_user_id()))
      )
  )
);

DROP POLICY IF EXISTS documents_insert_policy ON public.documents;
CREATE POLICY documents_insert_policy ON public.documents
FOR INSERT
WITH CHECK (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = documents.case_id
      AND (
        (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
      )
  )
);

DROP POLICY IF EXISTS documents_update_policy ON public.documents;
CREATE POLICY documents_update_policy ON public.documents
FOR UPDATE
USING (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = documents.case_id
      AND (
        (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
      )
  )
);

DROP POLICY IF EXISTS documents_delete_policy ON public.documents;
CREATE POLICY documents_delete_policy ON public.documents
FOR DELETE
USING (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = documents.case_id
      AND (
        (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false)
        OR (public.current_app_user_role() = 'LAWYER' AND public.is_user_assigned_to_case(c.id, public.current_app_user_id()))
      )
  )
);

-- ============================================================
-- 2. document_versions RLS Policies
-- ============================================================

DROP POLICY IF EXISTS document_versions_select_policy ON public.document_versions;
CREATE POLICY document_versions_select_policy ON public.document_versions
FOR SELECT
USING (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.documents d
    JOIN public.cases c ON c.id = d.case_id
    WHERE d.id = document_versions.document_id
      AND (
        (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false AND d.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
        OR (public.current_app_user_role() = 'SUPER_ADMIN' AND public.has_active_break_glass(c.id, public.current_app_user_id()))
      )
  )
);

DROP POLICY IF EXISTS document_versions_insert_policy ON public.document_versions;
CREATE POLICY document_versions_insert_policy ON public.document_versions
FOR INSERT
WITH CHECK (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.documents d
    JOIN public.cases c ON c.id = d.case_id
    WHERE d.id = document_versions.document_id
      AND (
        (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
      )
  )
);

DROP POLICY IF EXISTS document_versions_update_policy ON public.document_versions;
CREATE POLICY document_versions_update_policy ON public.document_versions
FOR UPDATE
USING (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.documents d
    JOIN public.cases c ON c.id = d.case_id
    WHERE d.id = document_versions.document_id
      AND (
        (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
      )
  )
);

-- ============================================================
-- 3. hearings RLS Policies
-- ============================================================

DROP POLICY IF EXISTS hearings_select_policy ON public.hearings;
CREATE POLICY hearings_select_policy ON public.hearings
FOR SELECT
USING (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = hearings.case_id
      AND (
        (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
        OR (public.current_app_user_role() = 'SUPER_ADMIN' AND public.has_active_break_glass(c.id, public.current_app_user_id()))
      )
  )
);

DROP POLICY IF EXISTS hearings_insert_policy ON public.hearings;
CREATE POLICY hearings_insert_policy ON public.hearings
FOR INSERT
WITH CHECK (
  public.current_app_user_id() IS NOT NULL
  AND public.current_app_user_role() IN ('OFFICE_ADMIN', 'LAWYER', 'ASSISTANT')
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = hearings.case_id
      AND (
        (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
      )
  )
);

DROP POLICY IF EXISTS hearings_update_policy ON public.hearings;
CREATE POLICY hearings_update_policy ON public.hearings
FOR UPDATE
USING (
  public.current_app_user_id() IS NOT NULL
  AND public.current_app_user_role() IN ('OFFICE_ADMIN', 'LAWYER', 'ASSISTANT')
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = hearings.case_id
      AND (
        (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
      )
  )
);

-- ============================================================
-- 4. tasks RLS Policies
-- ============================================================

DROP POLICY IF EXISTS tasks_select_policy ON public.tasks;
CREATE POLICY tasks_select_policy ON public.tasks
FOR SELECT
USING (
  public.current_app_user_id() IS NOT NULL
  AND (
    -- Office admin sees non-case tasks or tasks for non-restricted cases
    (public.current_app_user_role() = 'OFFICE_ADMIN' AND (
      case_id IS NULL 
      OR EXISTS (SELECT 1 FROM public.cases c WHERE c.id = tasks.case_id AND c.is_restricted = false)
    ))
    -- Assignee or Creator can always see the task
    OR assigned_to_user_id = public.current_app_user_id()
    OR created_by_id = public.current_app_user_id()
    -- Assigned lawyer on parent case
    OR (case_id IS NOT NULL AND public.is_user_assigned_to_case(case_id, public.current_app_user_id()))
    -- Super Admin with active break glass on parent case
    OR (case_id IS NOT NULL AND public.current_app_user_role() = 'SUPER_ADMIN' AND public.has_active_break_glass(case_id, public.current_app_user_id()))
  )
);

DROP POLICY IF EXISTS tasks_insert_policy ON public.tasks;
CREATE POLICY tasks_insert_policy ON public.tasks
FOR INSERT
WITH CHECK (
  public.current_app_user_id() IS NOT NULL
  AND (
    case_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = tasks.case_id
        AND (
          (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false)
          OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
        )
    )
  )
);

DROP POLICY IF EXISTS tasks_update_policy ON public.tasks;
CREATE POLICY tasks_update_policy ON public.tasks
FOR UPDATE
USING (
  public.current_app_user_id() IS NOT NULL
  AND (
    assigned_to_user_id = public.current_app_user_id()
    OR created_by_id = public.current_app_user_id()
    OR (public.current_app_user_role() = 'OFFICE_ADMIN' AND (
      case_id IS NULL 
      OR EXISTS (SELECT 1 FROM public.cases c WHERE c.id = tasks.case_id AND c.is_restricted = false)
    ))
    OR (case_id IS NOT NULL AND public.is_user_assigned_to_case(case_id, public.current_app_user_id()))
  )
);

-- ============================================================
-- 5. Role Grants for Restricted Runtime Role (lms_app)
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO lms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_versions TO lms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hearings TO lms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO lms_app;
