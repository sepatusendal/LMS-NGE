-- deleteTeachingReportAdmin() (meetings/admin-queries.ts, the standalone
-- "Delete Report" button in Manage Meeting — separate from Reset Meeting)
-- deleted teaching_reports directly, hitting the exact same foreign-key
-- violation as reset_meeting_admin() did before 20260915080000:
-- report_learning_objectives / student_follow_ups / progress_records all
-- reference teachingReportId with no ON DELETE CASCADE, so the delete fails
-- for any report where at least one student was marked present (i.e. almost
-- every real report). Wrapped as an atomic RPC that clears the three child
-- tables first, matching reset_meeting_admin()'s fix.
CREATE OR REPLACE FUNCTION public.delete_teaching_report_admin(p_report_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.report_learning_objectives WHERE "teachingReportId" = p_report_id;
  DELETE FROM public.student_follow_ups WHERE "teachingReportId" = p_report_id;
  DELETE FROM public.progress_records WHERE "teachingReportId" = p_report_id;
  DELETE FROM public.teaching_reports WHERE id = p_report_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REPORT_NOT_FOUND';
  END IF;
END;
$$;

-- SECURITY INVOKER — relies on the existing admin_all_* RLS policies (FOR
-- ALL) on all four tables, same as the direct-table call this replaces.
REVOKE ALL ON FUNCTION public.delete_teaching_report_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_teaching_report_admin(UUID) TO authenticated;
