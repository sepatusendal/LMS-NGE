-- Deep-audit finding, unrelated to the guru-pengganti support case fixed by
-- the two migrations above but caught while reviewing lesson_plans RLS
-- history: 20260811010000 added a classId re-validation to
-- "teacher_update_own_lesson_plans" (WITH CHECK) so a teacher couldn't send
-- a crafted UPDATE reparenting their own lesson plan to a class they don't
-- teach. 20260911020000 (7-day edit window) DROPPED and recreated the same
-- policy to add the scheduledDate window check, but didn't carry the
-- classId guard forward — silently reintroducing the exact gap the earlier
-- audit closed. The app layer never sends classId on update either way
-- (src/features/lesson-plans/queries.ts), but RLS must not depend on that.
--
-- Restored here using the same authorization the INSERT policy now allows
-- (20260912000000): primary teacher, or a class_temporary_schedules
-- substitute for that exact date — so a legitimate substitute editing their
-- own just-created plan isn't newly blocked by restoring this guard.
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
    )
  );
