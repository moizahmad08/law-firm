-- Migration: Grant FINANCE_ADMIN visibility to non-restricted cases and clients under RLS

DROP POLICY IF EXISTS cases_select_policy ON public.cases;
CREATE POLICY cases_select_policy ON public.cases
FOR SELECT
USING (
  public.current_app_user_id() IS NOT NULL
  AND (
    -- Office Admin and Finance Admin can see non-restricted cases
    (public.current_app_user_role() IN ('OFFICE_ADMIN', 'FINANCE_ADMIN') AND is_restricted = false)
    -- Assigned counsel/assistant/admin
    OR public.is_user_assigned_to_case(id, public.current_app_user_id())
    -- Super Admin with active approved emergency break-glass override
    OR (public.current_app_user_role() = 'SUPER_ADMIN' AND public.has_active_break_glass(id, public.current_app_user_id()))
  )
);

DROP POLICY IF EXISTS clients_select_policy ON public.clients;
CREATE POLICY clients_select_policy ON public.clients
FOR SELECT
USING (
  public.current_app_user_id() IS NOT NULL
  AND (
    -- Office Admin and Finance Admin have oversight of clients
    public.current_app_user_role() IN ('OFFICE_ADMIN', 'FINANCE_ADMIN')
    -- Or user has at least one accessible case linked to this client
    OR EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.client_id = clients.id
        AND (
          (public.current_app_user_role() IN ('OFFICE_ADMIN', 'FINANCE_ADMIN') AND c.is_restricted = false)
          OR public.is_user_assigned_to_case(c.id, public.current_app_user_id())
        )
    )
  )
);
