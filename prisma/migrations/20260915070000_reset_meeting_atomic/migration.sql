-- resetMeetingAdmin() (meetings/admin-queries.ts) — the admin "let the tutor
-- redo this meeting from scratch" recovery tool — ran 4 deletes concurrently
-- (Promise.all over check_ins/check_outs/attendances/teaching_reports) and
-- then a *separate* UPDATE resetting meetings.status back to 'SCHEDULED'.
-- Five independent round-trips, not one transaction. If any delete failed,
-- or the connection dropped between the deletes and the status update, the
-- meeting could end up stuck with status still 'COMPLETED' (or some deletes
-- done, others not) while its check-in/check-out/attendance/report rows are
-- gone — completedLpIds in fetchTodayClasses() treats status='COMPLETED' as
-- "nothing to do here", while the teacher's own displayed status
-- (hasCheckIn/hasReport-derived) would show "not_started" since the rows
-- are gone: the class becomes unreachable through the normal check-in flow,
-- with the recovery tool itself being the cause. Same class of bug as the
-- other non-atomic multi-step writes fixed this session; same fix shape.
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

-- SECURITY INVOKER — relies on the existing admin_all_* RLS policies (FOR
-- ALL) on check_ins/check_outs/attendances/teaching_reports/meetings, same
-- as the direct-table calls this replaces.
REVOKE ALL ON FUNCTION public.reset_meeting_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_meeting_admin(UUID) TO authenticated;
