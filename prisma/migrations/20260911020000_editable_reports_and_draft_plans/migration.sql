-- Three related workflow changes, requested after a real support case where
-- a tutor's Absensi card got stuck because she couldn't write a lesson plan
-- ahead of time, and had no way to fix a report she filled in from home
-- after a typo:
--
--   1. Check-in no longer requires a lesson plan to already exist. Instead
--      of making meetings.lessonPlanId nullable (touches nearly every query
--      in the app, which all assume "1 meeting = 1 lesson plan already
--      written"), check-in now auto-creates a *draft* lesson plan
--      (isDraft = true, placeholder topic) when none exists yet for that
--      class's next meeting slot — see check_in_with_draft_plan() below.
--   2. "Submit Absensi" and "Check-out" collapse into one atomic action —
--      submit_attendance_and_checkout() — instead of two separate manual
--      steps, matching the atomic-RPC pattern already used for
--      create_teaching_report().
--   3. Lesson plans and Daily Teaching Reports become editable by the
--      teacher who owns them, but only within 7 days of the class's
--      scheduled/actual date — long enough for someone finishing paperwork
--      at home a few days late, but not an open-ended window that would let
--      historical records (already fed into parent reports / payroll) drift
--      indefinitely. Teaching reports previously had NO teacher-facing edit
--      path at all (admin-only); this adds update_teaching_report() plus
--      the RLS to support it.

-- ─────────────────────────────────────────────────────────────
-- 1. Draft lesson plan flag
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.lesson_plans ADD COLUMN "isDraft" BOOLEAN NOT NULL DEFAULT false;

-- ─────────────────────────────────────────────────────────────
-- 2. 7-day edit window — lesson_plans
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "teacher_update_own_lesson_plans" ON public.lesson_plans;
CREATE POLICY "teacher_update_own_lesson_plans" ON public.lesson_plans FOR UPDATE
  USING (
    "createdByTeacherId" = public.current_teacher_id()
    AND "scheduledDate" >= CURRENT_DATE - INTERVAL '7 days'
  )
  WITH CHECK (
    "createdByTeacherId" = public.current_teacher_id()
    AND "scheduledDate" >= CURRENT_DATE - INTERVAL '7 days'
  );

-- ─────────────────────────────────────────────────────────────
-- 3. Teaching report edit capability (new — teachers had none before)
-- ─────────────────────────────────────────────────────────────

CREATE POLICY "teacher_update_own_teaching_reports" ON public.teaching_reports FOR UPDATE
  USING (
    public.is_teacher_meeting("meetingId")
    AND "actualTeachingDate" >= CURRENT_DATE - INTERVAL '7 days'
  )
  WITH CHECK (
    public.is_teacher_meeting("meetingId")
    AND "actualTeachingDate" >= CURRENT_DATE - INTERVAL '7 days'
  );

-- update_teaching_report() replaces the whole objectives/follow-up
-- breakdown (delete + reinsert) rather than diffing, mirroring how
-- create_teaching_report() writes them the first time. Needs DELETE
-- policies on both child tables that didn't exist before (teachers could
-- only INSERT/SELECT them).
CREATE POLICY "teacher_delete_own_report_learning_objectives" ON public.report_learning_objectives FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.teaching_reports tr
    WHERE tr.id = report_learning_objectives."teachingReportId" AND public.is_teacher_meeting(tr."meetingId")
  ));
CREATE POLICY "teacher_delete_own_student_follow_ups" ON public.student_follow_ups FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.teaching_reports tr
    WHERE tr.id = student_follow_ups."teachingReportId" AND public.is_teacher_meeting(tr."meetingId")
  ));

-- ─────────────────────────────────────────────────────────────
-- RPC: check_in_with_draft_plan
-- ─────────────────────────────────────────────────────────────
-- Used only when the Absensi card is in the "no_plan_today" state (no
-- lesson plan exists yet for this class's next meeting). The normal path
-- (a plan already exists) keeps using the existing client-side startClass()
-- flow untouched — this is purely an additional entry point, not a
-- replacement.
--
-- SECURITY INVOKER: runs as the calling teacher, so the lesson_plans INSERT
-- is still gated by the existing "teacher_insert_own_lesson_plans" policy
-- (primary teacher only — see 20260807000000's B-2 hardening). A covering
-- teacher reached only via a schedule override hitting this on a class with
-- zero lesson plans ever will get a clear error instead of a cryptic RLS
-- violation.
CREATE OR REPLACE FUNCTION public.check_in_with_draft_plan(
  p_class_id UUID,
  p_teacher_id UUID,
  p_meeting_number INT,
  p_week INT,
  p_scheduled_date DATE,
  p_is_late BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_lesson_plan_id UUID;
  v_meeting_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.classes c WHERE c.id = p_class_id AND c."teacherId" = public.current_teacher_id()
  ) THEN
    RAISE EXCEPTION 'NOT_PRIMARY_TEACHER';
  END IF;

  INSERT INTO public.lesson_plans (
    "classId", "createdByTeacherId", "meetingNumber", "week", "scheduledDate", "topic", "isDraft"
  ) VALUES (
    p_class_id, p_teacher_id, p_meeting_number, p_week, p_scheduled_date, '(Belum diisi)', true
  )
  RETURNING id INTO v_lesson_plan_id;

  INSERT INTO public.meetings ("lessonPlanId", "assignedTeacherId", "actualTeacherId", status)
  VALUES (v_lesson_plan_id, p_teacher_id, p_teacher_id, 'SCHEDULED')
  RETURNING id INTO v_meeting_id;

  INSERT INTO public.check_ins ("meetingId", "teacherId", "isLate")
  VALUES (v_meeting_id, p_teacher_id, p_is_late);

  RETURN v_meeting_id;
END;
$$;

REVOKE ALL ON FUNCTION public.check_in_with_draft_plan(UUID, UUID, INT, INT, DATE, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_in_with_draft_plan(UUID, UUID, INT, INT, DATE, BOOLEAN) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- RPC: submit_attendance_and_checkout
-- ─────────────────────────────────────────────────────────────
-- Collapses the previous 2-step "Simpan Absensi" then separate "Check-out"
-- into one action. Duration is computed here from check_ins.checkInTime
-- (server-side, authoritative) rather than in the client like the old
-- doCheckOut() did.
CREATE OR REPLACE FUNCTION public.submit_attendance_and_checkout(
  p_meeting_id UUID,
  p_teacher_id UUID,
  p_entries JSONB,
  p_notes TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_check_in_time TIMESTAMPTZ;
  v_duration_minutes INT;
BEGIN
  SELECT "checkInTime" INTO v_check_in_time FROM public.check_ins WHERE "meetingId" = p_meeting_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NO_CHECK_IN';
  END IF;

  INSERT INTO public.attendances ("meetingId", "studentId", status, notes)
  SELECT p_meeting_id, (e->>'studentId')::UUID, (e->>'status')::"AttendanceStatus", NULLIF(e->>'notes', '')
  FROM jsonb_array_elements(p_entries) AS e
  ON CONFLICT ("meetingId", "studentId") DO UPDATE
    SET status = EXCLUDED.status, notes = EXCLUDED.notes, "updatedAt" = now();

  v_duration_minutes := GREATEST(1, ROUND(EXTRACT(EPOCH FROM (now() - v_check_in_time)) / 60));

  INSERT INTO public.check_outs ("meetingId", "teacherId", "checkOutTime", "durationMinutes", notes)
  VALUES (p_meeting_id, p_teacher_id, now(), v_duration_minutes, NULLIF(p_notes, ''));

  RETURN v_duration_minutes;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_attendance_and_checkout(UUID, UUID, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_attendance_and_checkout(UUID, UUID, JSONB, TEXT) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- RPC: update_teaching_report
-- ─────────────────────────────────────────────────────────────
-- Mirrors create_teaching_report()'s shape (same field set) but UPDATEs the
-- existing row and replaces its objectives/follow-ups wholesale, instead of
-- inserting a new one. Deliberately does NOT touch progress_records (those
-- are a running log fed by the *original* submission, not something an
-- edit should retroactively rewrite) or meetings.status (already
-- COMPLETED since a report exists at all).
--
-- The UPDATE's own WITH CHECK (via "teacher_update_own_teaching_reports"
-- above) is what actually enforces the 7-day window and ownership — if it
-- matches zero rows (wrong teacher, or window expired), this raises a
-- single clear exception rather than silently no-op-ing.
CREATE OR REPLACE FUNCTION public.update_teaching_report(
  p_report_id UUID,
  p_skills TEXT[],
  p_objectives_achieved TEXT DEFAULT NULL,
  p_what_went_well TEXT DEFAULT NULL,
  p_what_needs_improvement TEXT DEFAULT NULL,
  p_next_lesson_notes TEXT DEFAULT NULL,
  p_homework_assigned TEXT DEFAULT NULL,
  p_photo_drive_file_id TEXT DEFAULT NULL,
  p_photo_file_name TEXT DEFAULT NULL,
  p_follow_ups JSONB DEFAULT '[]'::jsonb,
  p_objectives JSONB DEFAULT '[]'::jsonb,
  p_action_plan TEXT DEFAULT NULL,
  p_language_skills_focus TEXT DEFAULT NULL,
  p_activities_log TEXT DEFAULT NULL,
  p_resources_used TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_objectives_total INT;
  v_objectives_achieved_count INT;
  v_derived_objectives_achieved TEXT;
BEGIN
  v_objectives_total := jsonb_array_length(p_objectives);
  IF v_objectives_total > 0 THEN
    SELECT count(*) FILTER (WHERE (o->>'achieved')::boolean)
      INTO v_objectives_achieved_count
      FROM jsonb_array_elements(p_objectives) AS o;

    v_derived_objectives_achieved := CASE
      WHEN v_objectives_achieved_count = v_objectives_total THEN 'YES'
      WHEN v_objectives_achieved_count = 0 THEN 'NO'
      ELSE 'PARTIALLY'
    END;
  ELSE
    v_derived_objectives_achieved := NULLIF(p_objectives_achieved, '');
  END IF;

  UPDATE public.teaching_reports SET
    "skills" = p_skills,
    "objectivesAchieved" = v_derived_objectives_achieved::"ObjectivesAchieved",
    "whatWentWell" = NULLIF(p_what_went_well, ''),
    "whatNeedsImprovement" = NULLIF(p_what_needs_improvement, ''),
    "nextLessonNotes" = NULLIF(p_next_lesson_notes, ''),
    "homeworkAssigned" = NULLIF(p_homework_assigned, ''),
    "photoDriveFileId" = NULLIF(p_photo_drive_file_id, ''),
    "photoFileName" = NULLIF(p_photo_file_name, ''),
    "actionPlan" = NULLIF(p_action_plan, ''),
    "languageSkillsFocus" = NULLIF(p_language_skills_focus, ''),
    "activitiesLog" = NULLIF(p_activities_log, ''),
    "resourcesUsed" = NULLIF(p_resources_used, '')
  WHERE id = p_report_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REPORT_EDIT_NOT_ALLOWED';
  END IF;

  DELETE FROM public.report_learning_objectives WHERE "teachingReportId" = p_report_id;
  IF v_objectives_total > 0 THEN
    INSERT INTO public.report_learning_objectives ("teachingReportId", "objectiveText", achieved)
    SELECT p_report_id, o->>'text', (o->>'achieved')::boolean
    FROM jsonb_array_elements(p_objectives) AS o;
  END IF;

  DELETE FROM public.student_follow_ups WHERE "teachingReportId" = p_report_id;
  IF jsonb_array_length(p_follow_ups) > 0 THEN
    INSERT INTO public.student_follow_ups ("teachingReportId", "studentId", "note")
    SELECT p_report_id, (f->>'studentId')::UUID, f->>'note'
    FROM jsonb_array_elements(p_follow_ups) AS f;
  END IF;

  RETURN p_report_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_teaching_report(
  UUID, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_teaching_report(
  UUID, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, TEXT, TEXT, TEXT, TEXT
) TO authenticated;
