-- Migration: Milestone 6 - Legal Research, Template Drafting, Client Message Approvals & Secure External Sharing

-- 1. Create Enums
DO $$ BEGIN
  CREATE TYPE "PrecedentCourtType" AS ENUM (
    'SUPREME_COURT',
    'HIGH_COURT_SINDH',
    'HIGH_COURT_LAHORE',
    'HIGH_COURT_ISLAMABAD',
    'HIGH_COURT_PESHAWAR',
    'HIGH_COURT_BALOCHISTAN',
    'FEDERAL_SHARIAT_COURT',
    'APPELLATE_TRIBUNAL'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PrecedentPrecedentialWeight" AS ENUM ('BINDING', 'PERSUASIVE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PrecedentStatus" AS ENUM ('GOOD_LAW', 'OVERRULED', 'DISTINGUISHED', 'UNDER_REVIEW');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TemplateCategory" AS ENUM (
    'COURT_PLEADINGS',
    'APPLICATIONS',
    'CONTRACTS',
    'LEGAL_NOTICES',
    'CLIENT_CORRESPONDENCE',
    'OFFICE_DOCUMENTS'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "DocumentApprovalStatus" AS ENUM (
    'DRAFT',
    'PENDING_APPROVAL',
    'APPROVED',
    'EXPORTED_FOR_SIGNING',
    'SIGNED_COPY_UPLOADED',
    'REJECTED',
    'SUPERSEDED'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MessageChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'SMS');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MessageApprovalStatus" AS ENUM (
    'DRAFT',
    'PENDING_APPROVAL',
    'APPROVED',
    'REJECTED',
    'SENT',
    'FAILED'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PasswordDeliveryMethod" AS ENUM ('WHATSAPP', 'SMS', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Create legal_precedents Table
CREATE TABLE IF NOT EXISTS public.legal_precedents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    citation TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    court "PrecedentCourtType" NOT NULL,
    bench TEXT NOT NULL,
    bench_size INT NOT NULL DEFAULT 1,
    decision_year INT NOT NULL,
    decision_date DATE,
    precedential_weight "PrecedentPrecedentialWeight" NOT NULL DEFAULT 'BINDING',
    status "PrecedentStatus" NOT NULL DEFAULT 'GOOD_LAW',
    legal_topics TEXT[] NOT NULL DEFAULT '{}',
    statutory_provisions TEXT[] NOT NULL DEFAULT '{}',
    headnote TEXT NOT NULL,
    summary TEXT NOT NULL,
    source_url TEXT,
    verified_by_id UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_legal_precedents_court_weight ON public.legal_precedents(court, precedential_weight);
CREATE INDEX IF NOT EXISTS idx_legal_precedents_year ON public.legal_precedents(decision_year);

-- 3. Create document_templates Table
CREATE TABLE IF NOT EXISTS public.document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    category "TemplateCategory" NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    current_version_number INT NOT NULL DEFAULT 1,
    created_by_id UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create template_versions Table
CREATE TABLE IF NOT EXISTS public.template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.document_templates(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    content TEXT NOT NULL,
    available_tokens TEXT[] NOT NULL DEFAULT '{}',
    is_published BOOLEAN NOT NULL DEFAULT true,
    changelog TEXT,
    published_by_id UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT template_versions_unique_ver UNIQUE (template_id, version_number)
);

-- 5. Create generated_documents Table
CREATE TABLE IF NOT EXISTS public.generated_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.document_templates(id) ON DELETE SET NULL,
    template_version_number INT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    approval_status "DocumentApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    created_by_id UUID NOT NULL REFERENCES public.users(id),
    approved_by_id UUID REFERENCES public.users(id),
    approved_at TIMESTAMPTZ(6),
    rejection_reason TEXT,
    exported_at TIMESTAMPTZ(6),
    export_format TEXT,
    signed_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_generated_docs_case_status ON public.generated_documents(case_id, approval_status);

-- 6. Create client_messages Table
CREATE TABLE IF NOT EXISTS public.client_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id),
    channel "MessageChannel" NOT NULL DEFAULT 'EMAIL',
    recipient TEXT NOT NULL,
    subject TEXT,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'HEARING_UPDATE',
    approval_status "MessageApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    created_by_id UUID NOT NULL REFERENCES public.users(id),
    approved_by_id UUID REFERENCES public.users(id),
    approved_at TIMESTAMPTZ(6),
    rejection_reason TEXT,
    sent_at TIMESTAMPTZ(6),
    delivery_status TEXT,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_messages_case_status ON public.client_messages(case_id, approval_status);

-- 7. Create external_document_shares Table
CREATE TABLE IF NOT EXISTS public.external_document_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    is_password_protected BOOLEAN NOT NULL DEFAULT true,
    password_delivery_method "PasswordDeliveryMethod" NOT NULL DEFAULT 'WHATSAPP',
    delivery_recipient_contact TEXT,
    approval_status "MessageApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    created_by_id UUID NOT NULL REFERENCES public.users(id),
    approved_by_id UUID REFERENCES public.users(id),
    approved_at TIMESTAMPTZ(6),
    rejection_reason TEXT,
    sent_at TIMESTAMPTZ(6),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_external_shares_case_status ON public.external_document_shares(case_id, approval_status);

-- 8. Create external_share_items Table
CREATE TABLE IF NOT EXISTS public.external_share_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_id UUID NOT NULL REFERENCES public.external_document_shares(id) ON DELETE CASCADE,
    document_version_id UUID NOT NULL REFERENCES public.document_versions(id) ON DELETE CASCADE
);

-- ============================================================
-- 9. Enable and FORCE Row-Level Security
-- ============================================================

ALTER TABLE public.legal_precedents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_precedents FORCE ROW LEVEL SECURITY;

ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_templates FORCE ROW LEVEL SECURITY;

ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_versions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_documents FORCE ROW LEVEL SECURITY;

ALTER TABLE public.client_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_messages FORCE ROW LEVEL SECURITY;

ALTER TABLE public.external_document_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_document_shares FORCE ROW LEVEL SECURITY;

ALTER TABLE public.external_share_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_share_items FORCE ROW LEVEL SECURITY;

-- ============================================================
-- 10. Define RLS Policies
-- ============================================================

-- 10.1 legal_precedents RLS Policies (Chambers-Wide Knowledge)
DROP POLICY IF EXISTS legal_precedents_select_policy ON public.legal_precedents;
CREATE POLICY legal_precedents_select_policy ON public.legal_precedents
FOR SELECT
USING (public.current_app_user_id() IS NOT NULL);

DROP POLICY IF EXISTS legal_precedents_insert_policy ON public.legal_precedents;
CREATE POLICY legal_precedents_insert_policy ON public.legal_precedents
FOR INSERT
WITH CHECK (
  public.current_app_user_id() IS NOT NULL
  AND public.current_app_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN', 'LAWYER')
);

DROP POLICY IF EXISTS legal_precedents_update_policy ON public.legal_precedents;
CREATE POLICY legal_precedents_update_policy ON public.legal_precedents
FOR UPDATE
USING (
  public.current_app_user_id() IS NOT NULL
  AND public.current_app_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN', 'LAWYER')
);

-- 10.2 document_templates & template_versions RLS Policies
DROP POLICY IF EXISTS document_templates_select_policy ON public.document_templates;
CREATE POLICY document_templates_select_policy ON public.document_templates
FOR SELECT
USING (public.current_app_user_id() IS NOT NULL);

DROP POLICY IF EXISTS document_templates_insert_policy ON public.document_templates;
CREATE POLICY document_templates_insert_policy ON public.document_templates
FOR INSERT
WITH CHECK (
  public.current_app_user_id() IS NOT NULL
  AND public.current_app_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN', 'LAWYER')
);

DROP POLICY IF EXISTS document_templates_update_policy ON public.document_templates;
CREATE POLICY document_templates_update_policy ON public.document_templates
FOR UPDATE
USING (
  public.current_app_user_id() IS NOT NULL
  AND public.current_app_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN', 'LAWYER')
);

DROP POLICY IF EXISTS template_versions_select_policy ON public.template_versions;
CREATE POLICY template_versions_select_policy ON public.template_versions
FOR SELECT
USING (public.current_app_user_id() IS NOT NULL);

DROP POLICY IF EXISTS template_versions_insert_policy ON public.template_versions;
CREATE POLICY template_versions_insert_policy ON public.template_versions
FOR INSERT
WITH CHECK (
  public.current_app_user_id() IS NOT NULL
  AND public.current_app_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN', 'LAWYER')
);

-- 10.3 generated_documents RLS Policies (Strict Case Boundary)
DROP POLICY IF EXISTS generated_documents_select_policy ON public.generated_documents;
CREATE POLICY generated_documents_select_policy ON public.generated_documents
FOR SELECT
USING (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = generated_documents.case_id
      AND (
        (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
        OR (public.current_app_user_role() = 'SUPER_ADMIN' AND public.has_active_break_glass(c.id, public.current_app_user_id()))
      )
  )
);

DROP POLICY IF EXISTS generated_documents_insert_policy ON public.generated_documents;
CREATE POLICY generated_documents_insert_policy ON public.generated_documents
FOR INSERT
WITH CHECK (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = generated_documents.case_id
      AND (
        (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
      )
  )
);

DROP POLICY IF EXISTS generated_documents_update_policy ON public.generated_documents;
CREATE POLICY generated_documents_update_policy ON public.generated_documents
FOR UPDATE
USING (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = generated_documents.case_id
      AND (
        (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
      )
  )
);

-- 10.4 client_messages RLS Policies (Strict Case Boundary)
DROP POLICY IF EXISTS client_messages_select_policy ON public.client_messages;
CREATE POLICY client_messages_select_policy ON public.client_messages
FOR SELECT
USING (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = client_messages.case_id
      AND (
        (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
        OR (public.current_app_user_role() = 'SUPER_ADMIN' AND public.has_active_break_glass(c.id, public.current_app_user_id()))
      )
  )
);

DROP POLICY IF EXISTS client_messages_insert_policy ON public.client_messages;
CREATE POLICY client_messages_insert_policy ON public.client_messages
FOR INSERT
WITH CHECK (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = client_messages.case_id
      AND (
        (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
      )
  )
);

DROP POLICY IF EXISTS client_messages_update_policy ON public.client_messages;
CREATE POLICY client_messages_update_policy ON public.client_messages
FOR UPDATE
USING (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = client_messages.case_id
      AND (
        (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
      )
  )
);

-- 10.5 external_document_shares & items RLS Policies
DROP POLICY IF EXISTS external_document_shares_select_policy ON public.external_document_shares;
CREATE POLICY external_document_shares_select_policy ON public.external_document_shares
FOR SELECT
USING (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = external_document_shares.case_id
      AND (
        (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
        OR (public.current_app_user_role() = 'SUPER_ADMIN' AND public.has_active_break_glass(c.id, public.current_app_user_id()))
      )
  )
);

DROP POLICY IF EXISTS external_document_shares_insert_policy ON public.external_document_shares;
CREATE POLICY external_document_shares_insert_policy ON public.external_document_shares
FOR INSERT
WITH CHECK (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = external_document_shares.case_id
      AND (
        (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
      )
  )
);

DROP POLICY IF EXISTS external_document_shares_update_policy ON public.external_document_shares;
CREATE POLICY external_document_shares_update_policy ON public.external_document_shares
FOR UPDATE
USING (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = external_document_shares.case_id
      AND (
        (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
      )
  )
);

DROP POLICY IF EXISTS external_share_items_select_policy ON public.external_share_items;
CREATE POLICY external_share_items_select_policy ON public.external_share_items
FOR SELECT
USING (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.external_document_shares s
    JOIN public.cases c ON c.id = s.case_id
    WHERE s.id = external_share_items.share_id
      AND (
        (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
        OR (public.current_app_user_role() = 'SUPER_ADMIN' AND public.has_active_break_glass(c.id, public.current_app_user_id()))
      )
  )
);

DROP POLICY IF EXISTS external_share_items_insert_policy ON public.external_share_items;
CREATE POLICY external_share_items_insert_policy ON public.external_share_items
FOR INSERT
WITH CHECK (
  public.current_app_user_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.external_document_shares s
    JOIN public.cases c ON c.id = s.case_id
    WHERE s.id = external_share_items.share_id
      AND (
        (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false)
        OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
      )
  )
);

-- ============================================================
-- 11. Grant Permissions to Application Role (lms_app)
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.legal_precedents TO lms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.document_templates TO lms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.template_versions TO lms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.generated_documents TO lms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.client_messages TO lms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.external_document_shares TO lms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.external_share_items TO lms_app;
