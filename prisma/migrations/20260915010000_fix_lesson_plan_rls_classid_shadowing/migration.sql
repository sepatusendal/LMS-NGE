-- 20260912000300 added temp-schedule/override branches to
-- teacher_insert_own_lesson_plans and teacher_update_own_lesson_plans, each
-- written as `WHERE cts."classId" = "classId"` / `cso."classId" = "classId"`
-- intending the bare `"classId"` to correlate to the outer lesson_plans row.
-- SQL scoping doesn't work that way for a subquery: since class_temporary_
-- schedules/class_schedule_overrides each have their own "classId" column,
-- the bare reference binds to the SUBQUERY's own table (cts/cso), not the
-- outer one — Postgres resolves it silently (inner scope shadows outer) with
-- no ambiguity error, so this shipped without being caught. Confirmed live
-- via pg_policies: the stored expression reads `cts."classId" = cts."classId"`
-- and `cso."classId" = cso."classId"`, both permanent tautologies.
--
-- Net effect: not a lockout — the opposite. Each OR-branch degrades to "does
-- ANY temp-schedule/override row assign me that date/weekday", regardless of
-- which class it's for, letting a teacher author a lesson plan for a class
-- they have no temp-schedule/override claim on, as long as they have *some*
-- unrelated one on file for that date/weekday. Re-declare both policies with
-- the outer table qualified explicitly (`lesson_plans."classId"`,
-- `lesson_plans."scheduledDate"`) so the correlation actually holds.

DROP POLICY IF EXISTS "teacher_insert_own_lesson_plans" ON public.lesson_plans;
CREATE POLICY "teacher_insert_own_lesson_plans" ON public.lesson_plans FOR INSERT
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.id = lesson_plans."classId" AND c."teacherId" = public.current_teacher_id()
      )
      OR EXISTS (
        SELECT 1 FROM public.class_temporary_schedules cts
        WHERE cts."classId" = lesson_plans."classId"
          AND cts."teacherId" = public.current_teacher_id()
          AND cts."date" = lesson_plans."scheduledDate"
      )
      OR EXISTS (
        SELECT 1 FROM public.class_schedule_overrides cso
        WHERE cso."classId" = lesson_plans."classId"
          AND cso."teacherId" = public.current_teacher_id()
          AND cso."dayOfWeek" = EXTRACT(DOW FROM lesson_plans."scheduledDate")::INT
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
        WHERE c.id = lesson_plans."classId" AND c."teacherId" = public.current_teacher_id()
      )
      OR EXISTS (
        SELECT 1 FROM public.class_temporary_schedules cts
        WHERE cts."classId" = lesson_plans."classId"
          AND cts."teacherId" = public.current_teacher_id()
          AND cts."date" = lesson_plans."scheduledDate"
      )
      OR EXISTS (
        SELECT 1 FROM public.class_schedule_overrides cso
        WHERE cso."classId" = lesson_plans."classId"
          AND cso."teacherId" = public.current_teacher_id()
          AND cso."dayOfWeek" = EXTRACT(DOW FROM lesson_plans."scheduledDate")::INT
      )
    )
  );
