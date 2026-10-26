-- Milestone 1C: Row-Level Security (RLS) & Authorization Policies

-- 1. Helper function: Get current user ID from session context
CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.user_id', true), '')::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 2. Helper function: Get current user's role
CREATE OR REPLACE FUNCTION public.current_app_user_role()
RETURNS public."Role" AS $$
DECLARE
  v_role public."Role";
  v_user_id UUID;
BEGIN
  v_user_id := public.current_app_user_id();
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT role INTO v_role
  FROM public.users
  WHERE id = v_user_id AND is_active = true AND deleted_at IS NULL;

  RETURN v_role;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 3. Helper function: Check if user is actively assigned to case
CREATE OR REPLACE FUNCTION public.is_user_assigned_to_case(p_case_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_user_id IS NULL OR p_case_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.case_assignments
    WHERE case_id = p_case_id
      AND user_id = p_user_id
      AND is_active = true
      AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 4. Enable and FORCE Row-Level Security on protected tables
-- ============================================================

ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases FORCE ROW LEVEL SECURITY;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients FORCE ROW LEVEL SECURITY;

ALTER TABLE public.case_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_assignments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events FORCE ROW LEVEL SECURITY;

-- ============================================================
-- 5. RLS Policies on `cases`
-- ============================================================

DROP POLICY IF EXISTS cases_select_policy ON public.cases;
CREATE POLICY cases_select_policy ON public.cases
FOR SELECT
USING (
  public.current_app_user_id() IS NOT NULL
  AND (
    -- Office Admin can see non-restricted cases
    (public.current_app_user_role() = 'OFFICE_ADMIN' AND is_restricted = false)
    -- Or user is an assigned member on this case (covers Lawyer, Assistant, and Office Admin assigned to restricted case)
    OR public.is_user_assigned_to_case(id, public.current_app_user_id())
  )
);

DROP POLICY IF EXISTS cases_insert_policy ON public.cases;
CREATE POLICY cases_insert_policy ON public.cases
FOR INSERT
WITH CHECK (
  public.current_app_user_id() IS NOT NULL
  AND public.current_app_user_role() IN ('OFFICE_ADMIN', 'LAWYER')
);

DROP POLICY IF EXISTS cases_update_policy ON public.cases;
CREATE POLICY cases_update_policy ON public.cases
FOR UPDATE
USING (
  public.current_app_user_id() IS NOT NULL
  AND (
    (public.current_app_user_role() = 'OFFICE_ADMIN' AND is_restricted = false)
    OR public.is_user_assigned_to_case(id, public.current_app_user_id())
  )
);

-- ============================================================
-- 6. RLS Policies on `clients`
-- ============================================================

DROP POLICY IF EXISTS clients_select_policy ON public.clients;
CREATE POLICY clients_select_policy ON public.clients
FOR SELECT
USING (
  public.current_app_user_id() IS NOT NULL
  AND (
    -- Office Admin has office-wide client oversight
    public.current_app_user_role() = 'OFFICE_ADMIN'
    -- Or user has at least one accessible case linked to this client
    OR EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.client_id = clients.id
        AND (
          (public.current_app_user_role() = 'OFFICE_ADMIN' AND c.is_restricted = false)
          OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
        )
    )
  )
);

DROP POLICY IF EXISTS clients_insert_policy ON public.clients;
CREATE POLICY clients_insert_policy ON public.clients
FOR INSERT
WITH CHECK (
  public.current_app_user_id() IS NOT NULL
  AND public.current_app_user_role() IN ('OFFICE_ADMIN', 'LAWYER')
);

DROP POLICY IF EXISTS clients_update_policy ON public.clients;
CREATE POLICY clients_update_policy ON public.clients
FOR UPDATE
USING (
  public.current_app_user_id() IS NOT NULL
  AND (
    public.current_app_user_role() = 'OFFICE_ADMIN'
    OR EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.client_id = clients.id
        AND public.is_user_assigned_to_case(c.id, public.current_app_user_id())
    )
  )
);

-- ============================================================
-- 7. RLS Policies on `case_assignments`
-- ============================================================

DROP POLICY IF EXISTS case_assignments_select_policy ON public.case_assignments;
CREATE POLICY case_assignments_select_policy ON public.case_assignments
FOR SELECT
USING (
  public.current_app_user_id() IS NOT NULL
  AND (
    public.current_app_user_role() = 'OFFICE_ADMIN'
    OR user_id = public.current_app_user_id()
    OR public.is_user_assigned_to_case(case_id, public.current_app_user_id())
  )
);

DROP POLICY IF EXISTS case_assignments_all_admin_policy ON public.case_assignments;
CREATE POLICY case_assignments_all_admin_policy ON public.case_assignments
FOR ALL
USING (
  public.current_app_user_id() IS NOT NULL
  AND public.current_app_user_role() = 'OFFICE_ADMIN'
);

-- ============================================================
-- 8. RLS Policies on `sessions`
-- ============================================================

DROP POLICY IF EXISTS sessions_owner_policy ON public.sessions;
DROP POLICY IF EXISTS sessions_insert_policy ON public.sessions;
CREATE POLICY sessions_insert_policy ON public.sessions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS sessions_select_policy ON public.sessions;
CREATE POLICY sessions_select_policy ON public.sessions FOR SELECT USING (
  public.current_app_user_id() IS NULL
  OR user_id = public.current_app_user_id()
  OR public.current_app_user_role() = 'SUPER_ADMIN'
);
DROP POLICY IF EXISTS sessions_update_policy ON public.sessions;
CREATE POLICY sessions_update_policy ON public.sessions FOR UPDATE USING (
  public.current_app_user_id() IS NULL
  OR user_id = public.current_app_user_id()
  OR public.current_app_user_role() = 'SUPER_ADMIN'
);
DROP POLICY IF EXISTS sessions_delete_policy ON public.sessions;
CREATE POLICY sessions_delete_policy ON public.sessions FOR DELETE USING (
  public.current_app_user_id() IS NULL
  OR user_id = public.current_app_user_id()
  OR public.current_app_user_role() = 'SUPER_ADMIN'
);

-- ============================================================
-- 9. RLS Policies on `audit_events`
-- ============================================================

-- Any request can append to audit records
DROP POLICY IF EXISTS audit_events_insert_policy ON public.audit_events;
CREATE POLICY audit_events_insert_policy ON public.audit_events
FOR INSERT
WITH CHECK (true);

-- Permitted select for returning rows and viewing logs
DROP POLICY IF EXISTS audit_events_select_policy ON public.audit_events;
CREATE POLICY audit_events_select_policy ON public.audit_events
FOR SELECT
USING (true);

-- Function execution grants for lms_app
GRANT EXECUTE ON FUNCTION public.current_app_user_id() TO lms_app;
GRANT EXECUTE ON FUNCTION public.current_app_user_role() TO lms_app;
GRANT EXECUTE ON FUNCTION public.is_user_assigned_to_case(UUID, UUID) TO lms_app;