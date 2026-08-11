-- Security audit finding (pre-production review): "teacher_update_own_lesson_plans"
-- (20260806071000) only re-checks "createdByTeacherId" = current_teacher_id()
-- on UPDATE — it never re-validates "classId" against the teacher's actual
-- class ownership. A teacher editing their own lesson plan could send a
-- crafted update that reparents it to a class they don't teach (colliding
-- with that class's meetingNumber uniqueness, or hiding the plan from its
-- rightful class). The app layer no longer sends "classId" on update at all
-- (src/features/lesson-plans/queries.ts), but RLS should enforce this
-- independently of what the app happens to send — same primary-ownership
-- check already used by "teacher_insert_own_lesson_plans" since the B-2 fix
-- in 20260807000000_workflow_and_rls_hardening.

DROP POLICY IF EXISTS "teacher_update_own_lesson_plans" ON public.lesson_plans;
CREATE POLICY "teacher_update_own_lesson_plans" ON public.lesson_plans FOR UPDATE
  USING ("createdByTeacherId" = public.current_teacher_id())
  WITH CHECK (
    "createdByTeacherId" = public.current_teacher_id()
    AND EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = "classId" AND c."teacherId" = public.current_teacher_id()
    )
  );
