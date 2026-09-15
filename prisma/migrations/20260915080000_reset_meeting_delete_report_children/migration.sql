-- reset_meeting_admin() (20260915070000) tried to DELETE teaching_reports
-- directly, but report_learning_objectives / student_follow_ups /
-- progress_records all reference teachingReportId with no ON DELETE CASCADE
-- — the delete fails with a foreign-key violation on progress_records
-- whenever the report being reset actually has any (i.e. any report where
-- at least one student was marked present, which is the normal case).
-- Caught immediately by testing the just-added atomic wrapper in staging
-- against a real completed meeting (Aberdeen, meeting 7) rather than
-- shipped separately — the OLD (pre-atomic) 4-parallel-deletes version had
-- this exact same failure mode, silently leaving check-in/check-out/
-- attendance deleted while the report (and the meeting's COMPLETED status)
-- stayed behind, every time an admin reset a meeting with a real report.
CREATE OR REPLACE FUNCTION public.reset_meeting_admin(p_meeting_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.check_ins WHERE "meetingId" = p_meeting_id;
  DELETE FROM public.check_outs WHERE "meetingId" = p_meeting_id;
  DELETE FROM public.attendances WHERE "meetingId" = p_meeting_id;

  DELETE FROM public.report_learning_objectives
    WHERE "teachingReportId" IN (SELECT id FROM public.teaching_reports WHERE "meetingId" = p_meeting_id);
  DELETE FROM public.student_follow_ups
    WHERE "teachingReportId" IN (SELECT id FROM public.teaching_reports WHERE "meetingId" = p_meeting_id);
  DELETE FROM public.progress_records
    WHERE "teachingReportId" IN (SELECT id FROM public.teaching_reports WHERE "meetingId" = p_meeting_id);
  DELETE FROM public.teaching_reports WHERE "meetingId" = p_meeting_id;

  UPDATE public.meetings SET
    status = 'SCHEDULED',
    "isAdminEntered" = false,
    "adminEnteredByUserId" = NULL,
    "adminNote" = NULL
    WHERE id = p_meeting_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MEETING_NOT_FOUND';
  END IF;
END;
$$;
