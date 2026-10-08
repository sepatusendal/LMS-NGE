-- A one-off substitute ("Substitute Teachers": meetings.actualTeacherId = the
-- covering teacher, assignedTeacherId = the class's usual teacher) could read
-- the lesson plan of the meeting they cover but not edit it.
-- teacher_update_own_lesson_plans only lets the plan's CREATOR update it, and
-- the draft that assignSubstituteForLessonPlan() creates when the class has no
-- plan for that date is created in the ORIGINAL teacher's name. So the covering
-- teacher — usually the very person who has to fill that draft in — got a
-- silent 0-row update (surfaced as "edit window expired").
--
-- 1) A second, additive UPDATE policy for exactly that case: the substitute of
--    a non-cancelled meeting may update that meeting's lesson plan, inside the
--    same 7-day window as every other teacher edit, and cannot soft-delete it.
-- 2) RLS cannot compare the new row with the old one, so a BEFORE UPDATE
--    trigger keeps such an edit to the plan's CONTENT: a teacher editing a plan
--    someone else created cannot change its class, number, week, date, owner
--    or deletedAt. Plan creators, admins and server-side functions are not
--    affected — SECURITY DEFINER code and service-role scripts run with a
--    current_user other than `authenticated`, so the check-in / backfill /
--    admin RPCs that legitimately move a plan's date keep working.

CREATE POLICY "substitute_update_covered_lesson_plans" ON public.lesson_plans FOR UPDATE
  USING (
    "scheduledDate" >= CURRENT_DATE - INTERVAL '7 days'
    AND EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m."lessonPlanId" = lesson_plans.id
        AND m."actualTeacherId" = public.current_teacher_id()
        AND m."assignedTeacherId" <> public.current_teacher_id()
        AND m.status <> 'CANCELLED'
    )
  )
  WITH CHECK (
    "scheduledDate" >= CURRENT_DATE - INTERVAL '7 days'
    AND "deletedAt" IS NULL
    AND EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m."lessonPlanId" = lesson_plans.id
        AND m."actualTeacherId" = public.current_teacher_id()
        AND m."assignedTeacherId" <> public.current_teacher_id()
        AND m.status <> 'CANCELLED'
    )
  );

CREATE OR REPLACE FUNCTION public.guard_covered_lesson_plan_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_me UUID;
BEGIN
  -- Only direct client requests (PostgREST runs them as `authenticated`) are
  -- held to this; server-side functions and scripts are not.
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  v_me := public.current_teacher_id();
  -- Creators keep their existing rights; admins have always been unrestricted.
  -- Any other teacher only reaches this row through the substitute policy.
  IF v_me IS NULL OR OLD."createdByTeacherId" = v_me OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW."classId" IS DISTINCT FROM OLD."classId"
     OR NEW."meetingNumber" IS DISTINCT FROM OLD."meetingNumber"
     OR NEW."week" IS DISTINCT FROM OLD."week"
     OR NEW."scheduledDate" IS DISTINCT FROM OLD."scheduledDate"
     OR NEW."createdByTeacherId" IS DISTINCT FROM OLD."createdByTeacherId"
     OR NEW."deletedAt" IS DISTINCT FROM OLD."deletedAt" THEN
    RAISE EXCEPTION 'A covering teacher can edit the content of this lesson plan, not its class, number, week, date or owner'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_covered_lesson_plan_update
  BEFORE UPDATE ON public.lesson_plans
  FOR EACH ROW EXECUTE FUNCTION public.guard_covered_lesson_plan_update();
