-- Milestone 2D: Integrate Break-Glass Emergency Override into RLS Policies

-- 1. Helper function: Check if user has an active, approved Break-Glass emergency override
CREATE OR REPLACE FUNCTION public.has_active_break_glass(p_case_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_user_id IS NULL OR p_case_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.break_glass_requests
    WHERE target_case_id = p_case_id
      AND requested_by_user_id = p_user_id
      AND status = 'APPROVED'
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 2. Update cases SELECT policy
DROP POLICY IF EXISTS cases_select_policy ON public.cases;
CREATE POLICY cases_select_policy ON public.cases
FOR SELECT
USING (
  public.current_app_user_id() IS NOT NULL
  AND (
    -- Office Admin can see non-restricted cases
    (public.current_app_user_role() = 'OFFICE_ADMIN' AND is_restricted = false)
    -- Assigned counsel/assistant/admin
    OR public.is_user_assigned_to_case(id, public.current_app_user_id())
    -- Super Admin with active approved emergency break-glass override
    OR (public.current_app_user_role() = 'SUPER_ADMIN' AND public.has_active_break_glass(id, public.current_app_user_id()))
  )
);

-- 3. Update case_parties SELECT policy
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
        OR (public.current_app_user_role() = 'SUPER_ADMIN' AND public.has_active_break_glass(c.id, public.current_app_user_id()))
      )
  )
);

-- 4. Update custom_field_values SELECT policy
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
        OR (public.current_app_user_role() = 'SUPER_ADMIN' AND public.has_active_break_glass(c.id, public.current_app_user_id()))
      )
  )
);

-- 5. Update break_glass_requests UPDATE policy
DROP POLICY IF EXISTS break_glass_update_policy ON public.break_glass_requests;
CREATE POLICY break_glass_update_policy ON public.break_glass_requests
FOR UPDATE
USING (
  public.current_app_user_id() IS NOT NULL
  AND (
    public.current_app_user_role() = 'OFFICE_ADMIN'
    OR requested_by_user_id = public.current_app_user_id()
  )
);
