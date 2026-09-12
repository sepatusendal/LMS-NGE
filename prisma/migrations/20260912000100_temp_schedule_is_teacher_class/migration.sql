-- Follow-up audit finding on 20260912000000: is_teacher_class() (the read
-- gate for classes/schools/students/class_schedule_slots/meetings) was
-- widened in 20260806100000 for class_schedule_overrides substitutes, but
-- never for class_temporary_schedules — so a teacher named only on a Jadwal
-- Sementara row still couldn't read the class row itself. That silently
-- breaks the previous migration's own fix: assertNotHoliday() in
-- createLessonPlan selects classes.schoolId before ever reaching the
-- lesson_plans insert, and the class picker's lookup of the class's
-- name/schedule/curriculum would return nothing for it. Caught in a
-- follow-up audit before it could reproduce the same "guru pengganti can't
-- work with this class" support case one level up the read path.
CREATE OR REPLACE FUNCTION public.is_teacher_class(target_class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = target_class_id AND c."teacherId" = public.current_teacher_id()
  ) OR EXISTS (
    SELECT 1 FROM public.meetings m
    JOIN public.lesson_plans lp ON lp.id = m."lessonPlanId"
    WHERE lp."classId" = target_class_id
      AND (m."assignedTeacherId" = public.current_teacher_id() OR m."actualTeacherId" = public.current_teacher_id())
  ) OR EXISTS (
    SELECT 1 FROM public.class_schedule_overrides cso
    WHERE cso."classId" = target_class_id AND cso."teacherId" = public.current_teacher_id()
  ) OR EXISTS (
    SELECT 1 FROM public.class_temporary_schedules cts
    WHERE cts."classId" = target_class_id AND cts."teacherId" = public.current_teacher_id()
  );
$$;
