-- Migration: Milestone 5 - AI Document Assistant, OCR, Case Chat & Confirmation Queue

-- 1. Create Enums
DO $$ BEGIN
  CREATE TYPE "SummaryType" AS ENUM ('OVERVIEW', 'LEGAL_ISSUES', 'PROCEDURAL_HISTORY', 'FACTUAL_BACKGROUND');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ExtractedEventType" AS ENUM ('HEARING_DATE', 'FILING_DEADLINE', 'COMPLIANCE_TASK');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ExtractionStatus" AS ENUM ('PENDING_REVIEW', 'CONFIRMED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create document_pages table
CREATE TABLE IF NOT EXISTS public.document_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES public.document_versions(id) ON DELETE CASCADE,
    page_number INT NOT NULL,
    text_content TEXT NOT NULL,
    ocr_confidence DOUBLE PRECISION,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT document_pages_version_page_unique UNIQUE (version_id, page_number)
);

CREATE INDEX IF NOT EXISTS idx_document_pages_version_id ON public.document_pages(version_id);

-- 3. Create case_summaries table
CREATE TABLE IF NOT EXISTS public.case_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    summary_type "SummaryType" NOT NULL DEFAULT 'OVERVIEW',
    content TEXT NOT NULL,
    citations_json JSONB,
    generated_by_id UUID NOT NULL REFERENCES public.users(id),
    token_count INT,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_case_summaries_case_id ON public.case_summaries(case_id);

-- 4. Create case_chat_messages table
CREATE TABLE IF NOT EXISTS public.case_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id),
    role "ChatRole" NOT NULL DEFAULT 'USER',
    content TEXT NOT NULL,
    citations_json JSONB,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_case_chat_messages_case_created ON public.case_chat_messages(case_id, created_at);

-- 5. Create extracted_events table (Confirmation Review Queue)
CREATE TABLE IF NOT EXISTS public.extracted_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    document_version_id UUID REFERENCES public.document_versions(id) ON DELETE SET NULL,
    event_type "ExtractedEventType" NOT NULL DEFAULT 'HEARING_DATE',
    suggested_date TIMESTAMPTZ(6) NOT NULL,
    description TEXT NOT NULL,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    source_snippet TEXT NOT NULL,
    page_number INT,
    status "ExtractionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    reviewed_by_id UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMPTZ(6),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_extracted_events_case_status ON public.extracted_events(case_id, status);

-- ============================================================
-- 6. PostgreSQL Row-Level Security (RLS) Configuration
-- ============================================================

ALTER TABLE public.document_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_pages FORCE ROW LEVEL SECURITY;

ALTER TABLE public.case_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_summaries FORCE ROW LEVEL SECURITY;

ALTER TABLE public.case_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_chat_messages FORCE ROW LEVEL SECURITY;

ALTER TABLE public.extracted_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_events FORCE ROW LEVEL SECURITY;

-- 6.1 document_pages RLS Policies (inherits document / case permissions)
DROP POLICY IF EXISTS document_pages_select_policy ON public.document_pages;
CREATE POLICY document_pages_select_policy ON public.document_pages
FOR SELECT
USING (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.document_versions dv
    JOIN public.documents d ON d.id = dv.document_id
    JOIN public.cases c ON c.id = d.case_id
    WHERE dv.id = document_pages.version_id
      AND (
        (public.current_app_user_role() IN ('OFFICE_ADMIN', 'FINANCE_ADMIN') AND c.is_restricted = false AND d.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
        OR (public.current_app_user_role() = 'SUPER_ADMIN' AND public.has_active_break_glass(c.id, public.current_app_user_id()))
      )
  )
);

DROP POLICY IF EXISTS document_pages_insert_policy ON public.document_pages;
CREATE POLICY document_pages_insert_policy ON public.document_pages
FOR INSERT
WITH CHECK (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.document_versions dv
    JOIN public.documents d ON d.id = dv.document_id
    JOIN public.cases c ON c.id = d.case_id
    WHERE dv.id = document_pages.version_id
      AND (
        (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false AND d.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
      )
  )
);

-- 6.2 case_summaries RLS Policies
DROP POLICY IF EXISTS case_summaries_select_policy ON public.case_summaries;
CREATE POLICY case_summaries_select_policy ON public.case_summaries
FOR SELECT
USING (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = case_summaries.case_id
      AND (
        (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
        OR (public.current_app_user_role() = 'SUPER_ADMIN' AND public.has_active_break_glass(c.id, public.current_app_user_id()))
      )
  )
);

DROP POLICY IF EXISTS case_summaries_insert_policy ON public.case_summaries;
CREATE POLICY case_summaries_insert_policy ON public.case_summaries
FOR INSERT
WITH CHECK (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = case_summaries.case_id
      AND (
        (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
      )
  )
);

-- 6.3 case_chat_messages RLS Policies
DROP POLICY IF EXISTS case_chat_messages_select_policy ON public.case_chat_messages;
CREATE POLICY case_chat_messages_select_policy ON public.case_chat_messages
FOR SELECT
USING (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = case_chat_messages.case_id
      AND (
        (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
        OR (public.current_app_user_role() = 'SUPER_ADMIN' AND public.has_active_break_glass(c.id, public.current_app_user_id()))
      )
  )
);

DROP POLICY IF EXISTS case_chat_messages_insert_policy ON public.case_chat_messages;
CREATE POLICY case_chat_messages_insert_policy ON public.case_chat_messages
FOR INSERT
WITH CHECK (
  public.current_app_user_id() IS NOT NULL
  AND user_id = public.current_app_user_id()
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = case_chat_messages.case_id
      AND (
        (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
      )
  )
);

-- 6.4 extracted_events RLS Policies (Confirmation Queue)
DROP POLICY IF EXISTS extracted_events_select_policy ON public.extracted_events;
CREATE POLICY extracted_events_select_policy ON public.extracted_events
FOR SELECT
USING (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = extracted_events.case_id
      AND (
        (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
        OR (public.current_app_user_role() = 'SUPER_ADMIN' AND public.has_active_break_glass(c.id, public.current_app_user_id()))
      )
  )
);

DROP POLICY IF EXISTS extracted_events_insert_policy ON public.extracted_events;
CREATE POLICY extracted_events_insert_policy ON public.extracted_events
FOR INSERT
WITH CHECK (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = extracted_events.case_id
      AND (
        (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
      )
  )
);

DROP POLICY IF EXISTS extracted_events_update_policy ON public.extracted_events;
CREATE POLICY extracted_events_update_policy ON public.extracted_events
FOR UPDATE
USING (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = extracted_events.case_id
      AND (
        (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
      )
  )
);

-- ============================================================
-- 7. Grant Permissions to Application Role (lms_app)
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.document_pages TO lms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.case_summaries TO lms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.case_chat_messages TO lms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.extracted_events TO lms_app;
