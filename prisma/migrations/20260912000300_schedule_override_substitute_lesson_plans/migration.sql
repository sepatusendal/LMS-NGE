-- Corrects the actual root cause of the guru-pengganti support case (the
-- two prior migrations today widened class_temporary_schedules access,
-- which turned out not to be this teacher's situation at all — she has zero
-- rows there). Live data: she is the class's ClassScheduleOverride
-- substitute (a recurring weekly split-class arrangement — see
-- 20260806100000's "Houstan: Bu Eni Wed, Latifa Sat" example, which is this
-- exact class) for Saturday, while a different teacher is the primary
-- (Wednesday). "teacher_insert_own_lesson_plans" (20260807000000, B-2)
-- deliberately blocks an override substitute from authoring ANY lesson plan
-- for the class, to stop a one-day override from claiming authorship of the
-- WHOLE class's plans. That protection is broader than necessary: an
-- override substitute only ever teaches on their own specific weekday, so
-- scoping the allowance to "the plan's scheduledDate falls on the
-- override's dayOfWeek" gives them exactly what they need (write their own
-- Saturday's plan) without reopening the B-2 gap (still can't touch a plan
-- dated for the primary teacher's Wednesday).
DROP POLICY IF EXISTS "teacher_insert_own_lesson_plans" ON public.lesson_plans;
CREATE POLICY "teacher_insert_own_lesson_plans" ON public.lesson_plans FOR INSERT
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.id = "classId" AND c."teacherId" = public.current_teacher_id()
      )
      OR EXISTS (
        SELECT 1 FROM public.class_temporary_schedules cts
        WHERE cts."classId" = "classId"
          AND cts."teacherId" = public.current_teacher_id()
          AND cts."date" = "scheduledDate"
      )
      OR EXISTS (
        SELECT 1 FROM public.class_schedule_overrides cso
        WHERE cso."classId" = "classId"
          AND cso."teacherId" = public.current_teacher_id()
          AND cso."dayOfWeek" = EXTRACT(DOW FROM "scheduledDate")::INT
      )
    )
    AND "createdByTeacherId" = public.current_teacher_id()
  );

DROP POLICY IF EXISTS "teacher_update_own_lesson_plans" ON public.lesson_plans;
CREATE POLICY "teacher_update_own_lesson_plans" ON public.lesson_plans FOR UPDATE
  USING (
    "createdByTeacherId" = public.current_teacher_id()
    AND "scheduledDate" >= CURRENT_DATE - INTERVAL '7 days'
  )
  WITH CHECK (
    "createdByTeacherId" = public.current_teacher_id()
    AND "scheduledDate" >= CURRENT_DATE - INTERVAL '7 days'
    AND (
      EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.id = "classId" AND c."teacherId" = public.current_teacher_id()
      )
      OR EXISTS (
        SELECT 1 FROM public.class_temporary_schedules cts
        WHERE cts."classId" = "classId"
          AND cts."teacherId" = public.current_teacher_id()
          AND cts."date" = "scheduledDate"
      )
      OR EXISTS (
        SELECT 1 FROM public.class_schedule_overrides cso
        WHERE cso."classId" = "classId"
          AND cso."teacherId" = public.current_teacher_id()
          AND cso."dayOfWeek" = EXTRACT(DOW FROM "scheduledDate")::INT
      )
    )
  );

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
  ) AND NOT EXISTS (
    SELECT 1 FROM public.class_temporary_schedules cts
    WHERE cts."classId" = p_class_id
      AND cts."teacherId" = public.current_teacher_id()
      AND cts."date" = p_scheduled_date
  ) AND NOT EXISTS (
    SELECT 1 FROM public.class_schedule_overrides cso
    WHERE cso."classId" = p_class_id
      AND cso."teacherId" = public.current_teacher_id()
      AND cso."dayOfWeek" = EXTRACT(DOW FROM p_scheduled_date)::INT
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
