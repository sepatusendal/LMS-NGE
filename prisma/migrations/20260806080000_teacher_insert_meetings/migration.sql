-- Teacher "Mulai Kelas" (check-in) creates the Meeting row on first use for
-- that lesson plan (context.md Section 4/5.1). No INSERT policy existed for
-- Teacher on meetings, so this always failed under RLS.

CREATE POLICY "teacher_insert_own_meetings" ON public.meetings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lesson_plans lp
      WHERE lp.id = "lessonPlanId" AND public.is_teacher_class(lp."classId")
    )
    AND "assignedTeacherId" = public.current_teacher_id()
  );
