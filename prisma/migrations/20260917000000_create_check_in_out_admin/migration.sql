-- MeetingAdminDialog's CheckInSection/CheckOutSection could only edit or
-- delete a check-in/check-out that already existed — for a meeting that was
-- started by the tutor (lesson plan + meeting created normally) but never
-- got check-in and/or check-out at all (tutor forgot, or the class already
-- finished and nobody in the LMS knows it happened), admin had no way to
-- fill that gap short of "Reset Meeting" + backfill_meeting_admin(), which
-- also throws away the tutor's own lesson plan. Add the missing "create"
-- half to match update/delete, scoped to a meeting that already exists (the
-- no-meeting-at-all case stays backfill_meeting_admin()'s job).
--
-- Both mirror backfill_meeting_admin()'s explicit is_admin() guard (defense
-- in depth on top of the admin_all_check_ins/admin_all_check_outs RLS
-- policies) and its "check-out needs a check-in" ordering rule, and tag the
-- meeting isAdminEntered/adminEnteredByUserId/adminNote — same reasoning as
-- 20260915000000: this is admin filling in for a tutor who never touched
-- the LMS for this step, not admin editing the tutor's own entry.
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
  v_check_in_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  SELECT COALESCE("actualTeacherId", "assignedTeacherId") INTO v_teacher_id
  FROM public.meetings WHERE id = p_meeting_id;
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

  RETURN v_check_in_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_check_in_admin(UUID, TIMESTAMPTZ, BOOLEAN, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_check_in_admin(UUID, TIMESTAMPTZ, BOOLEAN, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_check_out_admin(
  p_meeting_id UUID,
  p_check_out_time TIMESTAMPTZ,
  p_duration_minutes INT DEFAULT NULL,
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
  v_check_in_time TIMESTAMPTZ;
  v_duration_minutes INT;
  v_check_out_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  SELECT COALESCE("actualTeacherId", "assignedTeacherId") INTO v_teacher_id
  FROM public.meetings WHERE id = p_meeting_id;
  IF v_teacher_id IS NULL THEN
    RAISE EXCEPTION 'MEETING_NOT_FOUND';
  END IF;

  SELECT "checkInTime" INTO v_check_in_time
  FROM public.check_ins WHERE "meetingId" = p_meeting_id;
  IF v_check_in_time IS NULL THEN
    RAISE EXCEPTION 'CHECK_IN_REQUIRED_BEFORE_CHECK_OUT';
  END IF;

  IF EXISTS (SELECT 1 FROM public.check_outs WHERE "meetingId" = p_meeting_id) THEN
    RAISE EXCEPTION 'CHECK_OUT_EXISTS';
  END IF;

  v_duration_minutes := COALESCE(
    p_duration_minutes,
    GREATEST(1, ROUND(EXTRACT(EPOCH FROM (p_check_out_time - v_check_in_time)) / 60))
  );

  INSERT INTO public.check_outs ("meetingId", "teacherId", "checkOutTime", "durationMinutes", "notes")
  VALUES (p_meeting_id, v_teacher_id, p_check_out_time, v_duration_minutes, NULLIF(p_notes, ''))
  RETURNING id INTO v_check_out_id;

  UPDATE public.meetings SET
    "isAdminEntered" = true,
    "adminEnteredByUserId" = auth.uid(),
    "adminNote" = COALESCE(p_admin_note, "adminNote")
  WHERE id = p_meeting_id;

  RETURN v_check_out_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_check_out_admin(UUID, TIMESTAMPTZ, INT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_check_out_admin(UUID, TIMESTAMPTZ, INT, TEXT, TEXT) TO authenticated;
