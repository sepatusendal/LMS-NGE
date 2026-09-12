-- Real support case: a teacher covering a class only through a Jadwal
-- Sementara / class_temporary_schedules row (teacherId set on that row,
-- e.g. exam-week coverage) could not save a lesson plan for that class at
-- all — "new row violates row-level security policy for table
-- \"lesson_plans\"". "teacher_insert_own_lesson_plans" (20260807000000,
-- the B-2 hardening) intentionally restricts INSERT to the class's primary
-- teacher (classes.teacherId) to stop a one-day class_schedule_overrides
-- substitute from authoring plans for the WHOLE class. That reasoning does
-- not apply to class_temporary_schedules: it is already scoped to one
-- specific date per row, so a substitute named there is only ever eligible
-- for that exact date's lesson plan, never the class in general.
--
-- Widen the INSERT check accordingly, and apply the same widening to
-- check_in_with_draft_plan() (20260911020000), which had its own separate
-- NOT_PRIMARY_TEACHER guard duplicating the old, narrower rule.
--
-- Separately: class_temporary_schedules has never had RLS enabled (every
-- sibling table — class_schedule_overrides, class_schedule_slots,
-- holidays — does). Under Supabase's default-deny-without-RLS-is-actually-
-- allow-all-to-authenticated grant setup this means any authenticated user
-- could read/write every row. Close that gap with the same
-- admin/coordinator/teacher shape used for class_schedule_overrides.

-- ─────────────────────────────────────────────────────────────
-- RLS for class_temporary_schedules (previously missing entirely)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.class_temporary_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_class_temporary_schedules" ON public.class_temporary_schedules FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "coordinator_read_class_temporary_schedules" ON public.class_temporary_schedules FOR SELECT
  USING (public.is_coordinator());
CREATE POLICY "teacher_read_class_temporary_schedules" ON public.class_temporary_schedules FOR SELECT
  USING (
    public.is_teacher_class("classId")
    OR "teacherId" = public.current_teacher_id()
  );

-- ─────────────────────────────────────────────────────────────
-- lesson_plans INSERT: also allow a same-date temporary-schedule substitute
-- ─────────────────────────────────────────────────────────────

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
    )
    AND "createdByTeacherId" = public.current_teacher_id()
  );

-- ─────────────────────────────────────────────────────────────
-- check_in_with_draft_plan(): same widening for the "Mulai Kelas" path
-- ─────────────────────────────────────────────────────────────

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
