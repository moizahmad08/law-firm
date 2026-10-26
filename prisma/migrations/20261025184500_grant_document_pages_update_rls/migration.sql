-- Migration: Add missing UPDATE policy on document_pages for upsert OCR idempotency

DROP POLICY IF EXISTS document_pages_update_policy ON public.document_pages;
CREATE POLICY document_pages_update_policy ON public.document_pages
FOR UPDATE
USING (
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
