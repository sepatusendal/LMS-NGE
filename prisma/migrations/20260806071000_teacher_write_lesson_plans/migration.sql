-- Teachers author their own class's Lesson Plans end-to-end (schedule +
-- content), at least 2 weeks ahead — see context.md Section 5.5 (corrected
-- per NGE's real workflow: not Admin-authored, Admin only monitors).

CREATE POLICY "teacher_insert_own_lesson_plans" ON public.lesson_plans FOR INSERT
  WITH CHECK (public.is_teacher_class("classId") AND "createdByTeacherId" = public.current_teacher_id());

CREATE POLICY "teacher_update_own_lesson_plans" ON public.lesson_plans FOR UPDATE
  USING ("createdByTeacherId" = public.current_teacher_id())
  WITH CHECK ("createdByTeacherId" = public.current_teacher_id());
