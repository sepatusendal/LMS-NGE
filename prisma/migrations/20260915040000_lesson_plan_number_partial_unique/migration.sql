-- lesson_plans(classId, meetingNumber) was a plain UNIQUE index, but
-- deleteLessonPlan() (lesson-plans/queries.ts) only soft-deletes (sets
-- deletedAt) — every "what's the next meeting number" computation in the
-- app already treats a soft-deleted plan as gone (filters deletedAt IS
-- NULL: createDraftLessonPlan, fetchTodayClasses' draftMeetingNumber,
-- LessonPlanForm's default), so after deleting a class's *highest*-numbered
-- plan, every one of those paths recomputes the exact same number the
-- deleted row still occupies at the constraint level — permanently
-- blocking that class from ever getting a new "next" lesson plan again
-- (DUPLICATE_MEETING_NUMBER forever). No production data is currently
-- affected (zero soft-deleted lesson plans exist yet), caught before it
-- could bite. Make the index partial so a deleted row's number is
-- genuinely free to reuse, matching what every query already assumes.
DROP INDEX IF EXISTS "lesson_plans_classId_meetingNumber_key";
CREATE UNIQUE INDEX "lesson_plans_classId_meetingNumber_key"
  ON public.lesson_plans ("classId", "meetingNumber")
  WHERE "deletedAt" IS NULL;

-- backfill_meeting_admin() (20260915000000, amended 20260915020000) was the
-- one numbering computation that did NOT filter deletedAt IS NULL — with
-- the index still a plain UNIQUE this accidentally avoided ever colliding
-- (it always counted past deleted rows too, so it never tried to reuse a
-- taken number), but now that the index is partial, that same behavior
-- would instead create unnecessary gaps (skipping a number that's actually
-- free again) instead of reusing it like every other path does. Align it.
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
  v_meeting_number INT;
  v_week INT;
  v_lesson_plan_id UUID;
  v_meeting_id UUID;
  v_duration_minutes INT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  IF p_check_out_time IS NOT NULL AND p_check_in_time IS NULL THEN
    RAISE EXCEPTION 'CHECK_IN_REQUIRED_BEFORE_CHECK_OUT';
  END IF;

  SELECT id INTO v_lesson_plan_id
    FROM public.lesson_plans
    WHERE "classId" = p_class_id AND "scheduledDate" = p_scheduled_date AND "deletedAt" IS NULL
    LIMIT 1;

  IF v_lesson_plan_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.meetings WHERE "lessonPlanId" = v_lesson_plan_id) THEN
      RAISE EXCEPTION 'MEETING_ALREADY_EXISTS';
    END IF;

    UPDATE public.lesson_plans SET
      topic = p_topic,
      "learningObjectives" = CASE WHEN array_length(p_learning_objectives, 1) > 0
        THEN p_learning_objectives ELSE "learningObjectives" END,
      "isAdminEntered" = true,
      "adminEnteredByUserId" = v_admin_id,
      "adminNote" = COALESCE(NULLIF(p_admin_note, ''), "adminNote")
      WHERE id = v_lesson_plan_id;
  ELSE
    SELECT COALESCE(MAX("meetingNumber"), 0) + 1 INTO v_meeting_number
      FROM public.lesson_plans WHERE "classId" = p_class_id AND "deletedAt" IS NULL;
    v_week := CEIL(v_meeting_number / 2.0);

    INSERT INTO public.lesson_plans (
      "classId", "createdByTeacherId", "meetingNumber", "week", "scheduledDate", "topic",
      "learningObjectives", "isAdminEntered", "adminEnteredByUserId", "adminNote"
    ) VALUES (
      p_class_id, p_actual_teacher_id, v_meeting_number, v_week, p_scheduled_date, p_topic,
      p_learning_objectives, true, v_admin_id, p_admin_note
    )
    RETURNING id INTO v_lesson_plan_id;
  END IF;

  BEGIN
    INSERT INTO public.meetings (
      "lessonPlanId", "assignedTeacherId", "actualTeacherId",
      "isAdminEntered", "adminEnteredByUserId", "adminNote"
    ) VALUES (
      v_lesson_plan_id, p_actual_teacher_id, p_actual_teacher_id,
      true, v_admin_id, p_admin_note
    )
    RETURNING id INTO v_meeting_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'MEETING_ALREADY_EXISTS';
  END;

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
