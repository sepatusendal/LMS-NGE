-- Admin had no way to correct which tutor actually taught a meeting once it
-- was checked in / completed: the "Ganti Tutor" control is hidden after
-- check-in, and assignSubstituteForLessonPlan()/cancelSubstitute() refuse to
-- touch a meeting that already has a check-in (a guard aimed at tutors and
-- at batch substitute assignment racing a live check-in — the
-- enforce_no_substitute_change_after_checkin trigger already lets admin
-- through). The real-world gap: a substitute tutor teaches under another
-- tutor's account without telling admin, so the meeting, check-in, check-out
-- and report are all attributed to the wrong person and stay that way.
--
-- Changing meetings.actualTeacherId alone is not enough: the tutor
-- attendance analytics and dashboard read the attending teacher from
-- check_ins.teacherId, and the report list falls back to the report's own
-- teacher columns — leaving those behind would show the old tutor in some
-- views and the new one in others. This RPC moves them together, atomically.
--
-- p_teacher_id = the meeting's assigned teacher clears the substitute
-- (substituteReason = NULL), same as cancelSubstitute() does for a meeting
-- that hasn't started; any other teacher requires a reason.
CREATE OR REPLACE FUNCTION public.reassign_meeting_tutor_admin(
  p_meeting_id UUID,
  p_teacher_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_assigned_teacher_id UUID;
  v_is_substitute BOOLEAN;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  SELECT "assignedTeacherId" INTO v_assigned_teacher_id
  FROM public.meetings WHERE id = p_meeting_id
  FOR UPDATE;
  IF v_assigned_teacher_id IS NULL THEN
    RAISE EXCEPTION 'MEETING_NOT_FOUND';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.teachers WHERE id = p_teacher_id) THEN
    RAISE EXCEPTION 'TEACHER_NOT_FOUND';
  END IF;

  v_is_substitute := p_teacher_id <> v_assigned_teacher_id;
  IF v_is_substitute AND COALESCE(btrim(p_reason), '') = '' THEN
    RAISE EXCEPTION 'REASON_REQUIRED';
  END IF;

  UPDATE public.meetings SET
    "actualTeacherId" = p_teacher_id,
    "substituteReason" = CASE WHEN v_is_substitute THEN p_reason ELSE NULL END
  WHERE id = p_meeting_id;

  UPDATE public.check_ins SET "teacherId" = p_teacher_id WHERE "meetingId" = p_meeting_id;
  UPDATE public.check_outs SET "teacherId" = p_teacher_id WHERE "meetingId" = p_meeting_id;

  -- originalTeacherId stays the scheduled tutor; substituteTeacherId /
  -- replacementReason mirror the meeting's substitute state.
  UPDATE public.teaching_reports SET
    "substituteTeacherId" = CASE WHEN v_is_substitute THEN p_teacher_id ELSE NULL END,
    "replacementReason" = CASE WHEN v_is_substitute THEN p_reason ELSE NULL END
  WHERE "meetingId" = p_meeting_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reassign_meeting_tutor_admin(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reassign_meeting_tutor_admin(UUID, UUID, TEXT) TO authenticated;
