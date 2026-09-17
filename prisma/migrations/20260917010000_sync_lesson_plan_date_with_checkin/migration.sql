-- Admin correcting a check-in's time in MeetingAdminDialog to a different
-- calendar day (e.g. the tutor's session actually happened Sep 10, not the
-- Sep 17 it was originally logged under) only ever touched check_ins.
-- checkInTime — updateCheckInAdmin() (meetings/admin-queries.ts) was a plain
-- `.from("check_ins").update(...)`, no RPC involved at all. Every
-- admin-facing "what date is this meeting" view (Status Board, Analytics'
-- lesson-plan/student-attendance/classes reports, and the Tutor Attendance
-- Report's own displayed date column — see src/features/analytics/
-- admin-queries.ts) is keyed on lesson_plans.scheduledDate, not
-- checkInTime, so the corrected meeting kept showing up under the stale
-- original date everywhere except the one report that happens to filter
-- (but not display) by checkInTime. Reported by an admin: moved Bolton's
-- check-in/check-out to Sep 10, dashboard still showed Sep 17.
--
-- Fix: move check-in edits onto an RPC (matching the create/delete side,
-- which already went through create_check_in_admin/delete_check_in_admin)
-- that also re-derives scheduledDate from the new checkInTime — same
-- Asia/Jakarta day-boundary conversion check_ins_set_is_late() already uses
-- for "which day did this happen" elsewhere. Applied to create_check_in_admin
-- too, for the same reason: filling in a check-in for an existing meeting
-- whose lesson plan date doesn't match should also correct it, not just the
-- from-scratch backfill path.
CREATE OR REPLACE FUNCTION public.create_check_in_admin(
  p_meeting_id UUID,
  p_check_in_time TIMESTAMPTZ,
  p_is_late BOOLEAN DEFAULT false,
  p_notes TEXT DEFAULT NULL,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_teacher_id UUID;
  v_lesson_plan_id UUID;
  v_check_in_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  SELECT COALESCE(m."actualTeacherId", m."assignedTeacherId"), m."lessonPlanId"
    INTO v_teacher_id, v_lesson_plan_id
  FROM public.meetings m WHERE m.id = p_meeting_id;
  IF v_teacher_id IS NULL THEN
    RAISE EXCEPTION 'MEETING_NOT_FOUND';
  END IF;

  IF EXISTS (SELECT 1 FROM public.check_ins WHERE "meetingId" = p_meeting_id) THEN
    RAISE EXCEPTION 'CHECK_IN_EXISTS';
  END IF;

  INSERT INTO public.check_ins ("meetingId", "teacherId", "checkInTime", "isLate", "notes")
  VALUES (p_meeting_id, v_teacher_id, p_check_in_time, p_is_late, NULLIF(p_notes, ''))
  RETURNING id INTO v_check_in_id;

  UPDATE public.meetings SET
    "isAdminEntered" = true,
    "adminEnteredByUserId" = auth.uid(),
    "adminNote" = COALESCE(p_admin_note, "adminNote")
  WHERE id = p_meeting_id;

  UPDATE public.lesson_plans SET "scheduledDate" = (p_check_in_time AT TIME ZONE 'Asia/Jakarta')::DATE
  WHERE id = v_lesson_plan_id;

  RETURN v_check_in_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_check_in_admin(UUID, TIMESTAMPTZ, BOOLEAN, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_check_in_admin(UUID, TIMESTAMPTZ, BOOLEAN, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_check_in_admin(
  p_check_in_id UUID,
  p_check_in_time TIMESTAMPTZ,
  p_is_late BOOLEAN,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_meeting_id UUID;
  v_lesson_plan_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  UPDATE public.check_ins SET
    "checkInTime" = p_check_in_time,
    "isLate" = p_is_late,
    "notes" = NULLIF(p_notes, '')
  WHERE id = p_check_in_id
  RETURNING "meetingId" INTO v_meeting_id;

  IF v_meeting_id IS NULL THEN
    RAISE EXCEPTION 'CHECK_IN_NOT_FOUND';
  END IF;

  SELECT "lessonPlanId" INTO v_lesson_plan_id FROM public.meetings WHERE id = v_meeting_id;

  UPDATE public.lesson_plans SET "scheduledDate" = (p_check_in_time AT TIME ZONE 'Asia/Jakarta')::DATE
  WHERE id = v_lesson_plan_id;
END;
$$;

-- SECURITY INVOKER — relies on the existing admin_all_check_ins/
-- admin_all_lesson_plans RLS policies (both FOR ALL), same as every other
-- admin correction RPC in this file/its predecessors.
REVOKE ALL ON FUNCTION public.update_check_in_admin(UUID, TIMESTAMPTZ, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_check_in_admin(UUID, TIMESTAMPTZ, BOOLEAN, TEXT) TO authenticated;
