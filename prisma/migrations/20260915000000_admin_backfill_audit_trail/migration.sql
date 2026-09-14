-- Support case pattern from the field: some tutors teach a class but never
-- touch the LMS at all (report it manually via WhatsApp instead), some
-- forget they've transitioned to the LMS entirely, and some fill it in but
-- get the attendance/report content wrong. Admin already has unrestricted
-- RLS (`FOR ALL`) on lesson_plans/meetings/teaching_reports, but had no way
-- to (a) create a session from scratch when nothing exists yet, or (b) leave
-- a visible trail distinguishing "the tutor filled this in" from "admin
-- entered/corrected this on the tutor's behalf" — needed so reports built
-- from this data don't misrepresent who actually did the work, and so admin
-- can tell which tutors are chronically not using the LMS.
--
-- Three changes:
--   1. Audit columns (isAdminEntered / adminEnteredByUserId / adminNote) on
--      lesson_plans, meetings, and teaching_reports — the three tables an
--      admin can independently create/correct. check_ins/check_outs/
--      attendances don't get their own copies: their provenance is read off
--      meetings.isAdminEntered, since they only ever exist as part of one
--      meeting and a UI never needs to ask "was just the check-in backfilled
--      but not the check-out" separately from "was this meeting backfilled."
--   2. backfill_meeting_admin() — lets admin create an entire session (draft
--      lesson plan + meeting + check-in + check-out + attendance) for a
--      class/date where the tutor touched nothing at all. Mirrors
--      check_in_with_draft_plan() + submit_attendance_and_checkout()'s
--      shape, but as one admin-only atomic call instead of two teacher-only
--      ones. Deliberately does NOT also create the teaching report inline —
--      once this returns a real meetingId, the normal ReportForm/
--      create_teaching_report() path (extended below) handles that exactly
--      like it would for a tutor-run session, keeping one report code path
--      instead of a second one duplicated in SQL.
--   3. create_teaching_report()/update_teaching_report() gain admin bypass:
--      an admin can file or correct a report for any meeting (skipping the
--      "you must be this meeting's teacher" identity checks that only make
--      sense for teachers), tagging the row with the same audit columns.

-- ─────────────────────────────────────────────────────────────
-- 1. Audit columns
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.lesson_plans ADD COLUMN "isAdminEntered" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.lesson_plans ADD COLUMN "adminEnteredByUserId" UUID REFERENCES public.users(id);
ALTER TABLE public.lesson_plans ADD COLUMN "adminNote" TEXT;

ALTER TABLE public.meetings ADD COLUMN "isAdminEntered" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.meetings ADD COLUMN "adminEnteredByUserId" UUID REFERENCES public.users(id);
ALTER TABLE public.meetings ADD COLUMN "adminNote" TEXT;

ALTER TABLE public.teaching_reports ADD COLUMN "isAdminEntered" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.teaching_reports ADD COLUMN "adminEnteredByUserId" UUID REFERENCES public.users(id);
ALTER TABLE public.teaching_reports ADD COLUMN "adminNote" TEXT;

-- ─────────────────────────────────────────────────────────────
-- 2. RPC: backfill_meeting_admin
-- ─────────────────────────────────────────────────────────────
-- SECURITY DEFINER since this must succeed regardless of whether the caller
-- has a teachers row at all (admin usually doesn't) — RLS on these tables
-- already grants admin FOR ALL, but SECURITY DEFINER plus the explicit
-- is_admin() guard below is defense-in-depth matching the rest of this
-- migration set's style, and lets the function run its own duplicate check
-- before RLS is even reached.
--
-- Every step after the lesson plan/meeting insert is independently
-- skippable (NULL check-in time skips check-in/out entirely; empty
-- attendance array skips attendance) — an admin who only has a WhatsApp
-- message saying "she taught 9-10am, here's who was absent" can fill in
-- exactly that much today and come back to add the report separately once
-- ReportForm is available for this meetingId.
CREATE OR REPLACE FUNCTION public.backfill_meeting_admin(
  p_class_id UUID,
  p_actual_teacher_id UUID,
  p_scheduled_date DATE,
  p_topic TEXT,
  p_learning_objectives TEXT[] DEFAULT '{}',
  p_check_in_time TIMESTAMPTZ DEFAULT NULL,
  p_is_late BOOLEAN DEFAULT false,
  p_check_out_time TIMESTAMPTZ DEFAULT NULL,
  p_attendance JSONB DEFAULT '[]'::jsonb,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  -- Same "next meeting number for this class" derivation LessonPlanForm
  -- does client-side (Math.max(...)+1, week = ceil(number/2)) — computed
  -- here instead of accepted as a parameter so the admin filling this in
  -- from a WhatsApp report never has to know or guess the right number, and
  -- two admins backfilling different classes can't race on a client-guessed
  -- value.
  v_meeting_number INT;
  v_week INT;
  v_lesson_plan_id UUID;
  v_meeting_id UUID;
  v_duration_minutes INT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  SELECT COALESCE(MAX("meetingNumber"), 0) + 1 INTO v_meeting_number
    FROM public.lesson_plans WHERE "classId" = p_class_id;
  v_week := CEIL(v_meeting_number / 2.0);

  IF p_check_out_time IS NOT NULL AND p_check_in_time IS NULL THEN
    RAISE EXCEPTION 'CHECK_IN_REQUIRED_BEFORE_CHECK_OUT';
  END IF;

  INSERT INTO public.lesson_plans (
    "classId", "createdByTeacherId", "meetingNumber", "week", "scheduledDate", "topic",
    "learningObjectives", "isAdminEntered", "adminEnteredByUserId", "adminNote"
  ) VALUES (
    p_class_id, p_actual_teacher_id, v_meeting_number, v_week, p_scheduled_date, p_topic,
    p_learning_objectives, true, v_admin_id, p_admin_note
  )
  RETURNING id INTO v_lesson_plan_id;

  INSERT INTO public.meetings (
    "lessonPlanId", "assignedTeacherId", "actualTeacherId",
    "isAdminEntered", "adminEnteredByUserId", "adminNote"
  ) VALUES (
    v_lesson_plan_id, p_actual_teacher_id, p_actual_teacher_id,
    true, v_admin_id, p_admin_note
  )
  RETURNING id INTO v_meeting_id;

  IF p_check_in_time IS NOT NULL THEN
    INSERT INTO public.check_ins ("meetingId", "teacherId", "checkInTime", "isLate")
    VALUES (v_meeting_id, p_actual_teacher_id, p_check_in_time, p_is_late);
  END IF;

  IF p_check_out_time IS NOT NULL THEN
    v_duration_minutes := GREATEST(1, ROUND(EXTRACT(EPOCH FROM (p_check_out_time - p_check_in_time)) / 60));
    INSERT INTO public.check_outs ("meetingId", "teacherId", "checkOutTime", "durationMinutes")
    VALUES (v_meeting_id, p_actual_teacher_id, p_check_out_time, v_duration_minutes);
  END IF;

  IF jsonb_array_length(p_attendance) > 0 THEN
    INSERT INTO public.attendances ("meetingId", "studentId", status, notes)
    SELECT v_meeting_id, (e->>'studentId')::UUID, (e->>'status')::"AttendanceStatus", NULLIF(e->>'notes', '')
    FROM jsonb_array_elements(p_attendance) AS e;
  END IF;

  RETURN v_meeting_id;
END;
$$;

REVOKE ALL ON FUNCTION public.backfill_meeting_admin(
  UUID, UUID, DATE, TEXT, TEXT[], TIMESTAMPTZ, BOOLEAN, TIMESTAMPTZ, JSONB, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backfill_meeting_admin(
  UUID, UUID, DATE, TEXT, TEXT[], TIMESTAMPTZ, BOOLEAN, TIMESTAMPTZ, JSONB, TEXT
) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 3. create_teaching_report / update_teaching_report — admin bypass
-- ─────────────────────────────────────────────────────────────
-- Admin's FOR ALL RLS policy already lets these INSERT/UPDATE statements
-- reach any meeting's report regardless of the teacher-only policies
-- (RLS policies are OR'd), but the two RAISE EXCEPTION identity guards
-- inside create_teaching_report() are plain function logic, not RLS, so
-- they still need an explicit is_admin() carve-out. update_teaching_report()
-- has no such guard (it relies entirely on the UPDATE's own row match), so
-- it only needs the new p_admin_note parameter and audit-column SETs.

-- CREATE OR REPLACE can't add a parameter to an existing function — Postgres
-- treats a changed parameter list as a distinct overload instead of a
-- replacement, so without this DROP the old (p_admin_note-less) signature
-- stays around alongside the new one and every call becomes ambiguous
-- ("Could not choose the best candidate function") since p_admin_note has a
-- DEFAULT and both signatures match a call that omits it.
DROP FUNCTION IF EXISTS public.create_teaching_report(
  UUID, UUID, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, TEXT, TEXT, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION public.create_teaching_report(
  p_meeting_id UUID,
  p_original_teacher_id UUID,
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
  p_resources_used TEXT DEFAULT NULL,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_assigned_teacher_id UUID;
  v_actual_teacher_id UUID;
  v_substitute_reason TEXT;
  v_is_substitute BOOLEAN;
  v_is_admin BOOLEAN;
  v_report_id UUID;
  v_note TEXT;
  v_skill_areas TEXT[];
  v_student_ids UUID[];
  v_objectives_total INT;
  v_objectives_achieved_count INT;
  v_derived_objectives_achieved TEXT;
BEGIN
  v_is_admin := public.is_admin();

  SELECT "assignedTeacherId", "actualTeacherId", "substituteReason"
    INTO v_assigned_teacher_id, v_actual_teacher_id, v_substitute_reason
    FROM public.meetings
    WHERE id = p_meeting_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meeting % not found or not accessible', p_meeting_id;
  END IF;

  IF v_is_admin THEN
    -- Admin may file a report on behalf of either teacher actually tied to
    -- this meeting, but not fabricate attribution to someone unrelated to it.
    IF p_original_teacher_id IS DISTINCT FROM v_assigned_teacher_id
       AND p_original_teacher_id IS DISTINCT FROM v_actual_teacher_id THEN
      RAISE EXCEPTION 'INVALID_TEACHER_FOR_MEETING';
    END IF;
  ELSE
    IF public.current_teacher_id() IS DISTINCT FROM v_assigned_teacher_id
       AND public.current_teacher_id() IS DISTINCT FROM v_actual_teacher_id THEN
      RAISE EXCEPTION 'Anda bukan guru yang mengajar meeting ini';
    END IF;

    IF p_original_teacher_id IS DISTINCT FROM public.current_teacher_id() THEN
      RAISE EXCEPTION 'Tidak bisa mengisi laporan atas nama guru lain';
    END IF;
  END IF;

  v_is_substitute := p_original_teacher_id IS DISTINCT FROM v_assigned_teacher_id;

  -- Derive the flat objectivesAchieved status from the per-objective
  -- breakdown server-side, rather than trusting a client-computed enum, so
  -- the summary badge can never drift from the checklist it's built from.
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

  INSERT INTO public.teaching_reports (
    "meetingId", "originalTeacherId", "substituteTeacherId", "replacementReason",
    "actualTeachingDate", "skills", "objectivesAchieved", "whatWentWell",
    "whatNeedsImprovement", "nextLessonNotes", "homeworkAssigned",
    "photoDriveFileId", "photoFileName", "actionPlan",
    "languageSkillsFocus", "activitiesLog", "resourcesUsed",
    "isAdminEntered", "adminEnteredByUserId", "adminNote"
  ) VALUES (
    p_meeting_id,
    v_assigned_teacher_id,
    CASE WHEN v_is_substitute THEN p_original_teacher_id ELSE NULL END,
    CASE WHEN v_is_substitute THEN v_substitute_reason ELSE NULL END,
    CURRENT_DATE,
    p_skills,
    v_derived_objectives_achieved::"ObjectivesAchieved",
    NULLIF(p_what_went_well, ''),
    NULLIF(p_what_needs_improvement, ''),
    NULLIF(p_next_lesson_notes, ''),
    NULLIF(p_homework_assigned, ''),
    NULLIF(p_photo_drive_file_id, ''),
    NULLIF(p_photo_file_name, ''),
    NULLIF(p_action_plan, ''),
    NULLIF(p_language_skills_focus, ''),
    NULLIF(p_activities_log, ''),
    NULLIF(p_resources_used, ''),
    v_is_admin,
    CASE WHEN v_is_admin THEN auth.uid() ELSE NULL END,
    CASE WHEN v_is_admin THEN p_admin_note ELSE NULL END
  )
  RETURNING id INTO v_report_id;

  IF jsonb_array_length(p_follow_ups) > 0 THEN
    INSERT INTO public.student_follow_ups ("teachingReportId", "studentId", "note")
    SELECT v_report_id, (f->>'studentId')::UUID, f->>'note'
    FROM jsonb_array_elements(p_follow_ups) AS f;
  END IF;

  IF v_objectives_total > 0 THEN
    INSERT INTO public.report_learning_objectives ("teachingReportId", "objectiveText", achieved)
    SELECT v_report_id, o->>'text', (o->>'achieved')::boolean
    FROM jsonb_array_elements(p_objectives) AS o;
  END IF;

  SELECT array_agg(DISTINCT "studentId") INTO v_student_ids
    FROM public.attendances
    WHERE "meetingId" = p_meeting_id AND status IN ('PRESENT', 'LATE');

  IF v_student_ids IS NOT NULL AND array_length(v_student_ids, 1) > 0 THEN
    v_note := COALESCE(
      NULLIF(TRIM(p_what_went_well), ''),
      CASE v_derived_objectives_achieved
        WHEN 'YES' THEN 'Tercapai'
        WHEN 'PARTIALLY' THEN 'Sebagian'
        WHEN 'NO' THEN 'Belum Tercapai'
        ELSE NULL
      END,
      NULLIF(TRIM(p_activities_log), ''),
      'Progress tercatat dari Daily Teaching Report.'
    );

    v_skill_areas := CASE WHEN array_length(p_skills, 1) > 0 THEN p_skills ELSE ARRAY[NULL]::TEXT[] END;

    INSERT INTO public.progress_records ("studentId", "teachingReportId", "skillArea", "note")
    SELECT s, v_report_id, sk, v_note
    FROM unnest(v_student_ids) AS s
    CROSS JOIN unnest(v_skill_areas) AS sk;
  END IF;

  UPDATE public.meetings SET status = 'COMPLETED' WHERE id = p_meeting_id;

  RETURN v_report_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_teaching_report(
  UUID, UUID, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_teaching_report(
  UUID, UUID, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT
) TO authenticated;

-- Same overload hazard as create_teaching_report() above — drop the old
-- (p_admin_note-less) signature first so only one candidate remains.
DROP FUNCTION IF EXISTS public.update_teaching_report(
  UUID, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, TEXT, TEXT, TEXT, TEXT
);

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
  p_resources_used TEXT DEFAULT NULL,
  p_admin_note TEXT DEFAULT NULL
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
  v_is_admin BOOLEAN;
BEGIN
  v_is_admin := public.is_admin();

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
    "resourcesUsed" = NULLIF(p_resources_used, ''),
    "isAdminEntered" = CASE WHEN v_is_admin THEN true ELSE "isAdminEntered" END,
    "adminEnteredByUserId" = CASE WHEN v_is_admin THEN auth.uid() ELSE "adminEnteredByUserId" END,
    "adminNote" = CASE WHEN v_is_admin THEN COALESCE(p_admin_note, "adminNote") ELSE "adminNote" END
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
  UUID, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_teaching_report(
  UUID, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT
) TO authenticated;
