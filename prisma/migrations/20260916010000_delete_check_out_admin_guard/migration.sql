-- deleteCheckOutAdmin() (meetings/admin-queries.ts, MeetingAdminDialog's
-- standalone "Delete" button on the check-out card) deleted check_outs
-- directly with no check on whether a teaching_reports row for the same
-- meeting still exists. Mirrors the exact failure mode that
-- delete_check_in_admin() (20260915100000) was guarded against: a meeting
-- can end up with meetings.status = 'COMPLETED' and a full teaching report
-- on file, but no check-out row at all — payroll/duration derived from
-- check_outs.durationMinutes silently reads as missing for a meeting that
-- otherwise looks fully done. Guard it the same way: refuse the delete
-- (pointing the admin at "Reset Meeting" instead) whenever a teaching
-- report already exists for the meeting.
CREATE OR REPLACE FUNCTION public.delete_check_out_admin(p_check_out_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_meeting_id UUID;
BEGIN
  SELECT "meetingId" INTO v_meeting_id FROM public.check_outs WHERE id = p_check_out_id;
  IF v_meeting_id IS NULL THEN
    RAISE EXCEPTION 'CHECK_OUT_NOT_FOUND';
  END IF;

  IF EXISTS (SELECT 1 FROM public.teaching_reports WHERE "meetingId" = v_meeting_id) THEN
    RAISE EXCEPTION 'REPORT_EXISTS';
  END IF;

  DELETE FROM public.check_outs WHERE id = p_check_out_id;
END;
$$;

-- SECURITY INVOKER — relies on the existing admin_all_check_outs RLS policy
-- (FOR ALL), same as the direct-table call this replaces.
REVOKE ALL ON FUNCTION public.delete_check_out_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_check_out_admin(UUID) TO authenticated;
