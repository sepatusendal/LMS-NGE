-- A class meets at most once a day, but nothing stopped it from having two
-- lesson plans for the same date: only (classId, meetingNumber) was unique.
-- Production ended up with 28 (class, date) pairs holding 2-3 live plans — a
-- teacher writing a plan for a date an admin/substitute draft already covered,
-- a double-submitted form, or check_in_with_draft_plan() inserting a fresh
-- draft without looking at what was already on file. Whichever plan the
-- dashboard did not pick then lingered as an unattended past plan.
--
-- 1) A trigger that refuses a second LIVE plan for the same class + date.
--    It is a trigger rather than a unique index on purpose: 14 of those pairs
--    are historical sessions where BOTH plans already have a meeting,
--    check-in and report, so they cannot be merged or dropped without losing
--    records, and an index cannot be created over them. The trigger only
--    judges rows being written, so those pairs stay readable and editable;
--    once they have been sorted out this can become a plain partial unique
--    index ("classId", "scheduledDate") WHERE "deletedAt" IS NULL.
--    - SECURITY DEFINER so the lookup sees every plan, not just the ones RLS
--      lets the writing teacher read.
--    - A transaction-level advisory lock on class + date serialises two
--      concurrent writers; the second one then sees the first one's committed
--      row instead of both passing the check.
--    - An UPDATE that does not move the plan to another class/date (every
--      ordinary edit, which re-sends scheduledDate unchanged) is not checked,
--      so a teacher can still edit one of the historical pairs.
--    The error is SQLSTATE 23505 with message DUPLICATE_LESSON_PLAN_DATE.
--
-- 2) check_in_with_draft_plan() now checks in against the plan already on file
--    for that class + date instead of blindly inserting another draft, and
--    answers ALREADY_CHECKED_IN when that plan already has a meeting.

CREATE OR REPLACE FUNCTION public.enforce_one_lesson_plan_per_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- A deleted plan occupies nothing.
  IF NEW."deletedAt" IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Untouched placement on an already-live row: nothing new to judge.
  IF TG_OP = 'UPDATE'
     AND OLD."deletedAt" IS NULL
     AND NEW."classId" = OLD."classId"
     AND NEW."scheduledDate" = OLD."scheduledDate" THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext('lesson_plans_one_per_date'),
    hashtext(NEW."classId"::text || ':' || NEW."scheduledDate"::text)
  );

  IF EXISTS (
    SELECT 1 FROM public.lesson_plans lp
    WHERE lp."classId" = NEW."classId"
      AND lp."scheduledDate" = NEW."scheduledDate"
      AND lp."deletedAt" IS NULL
      AND lp.id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_LESSON_PLAN_DATE' USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_one_lesson_plan_per_date() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_one_lesson_plan_per_date ON public.lesson_plans;
CREATE TRIGGER enforce_one_lesson_plan_per_date
  BEFORE INSERT OR UPDATE ON public.lesson_plans
  FOR EACH ROW EXECUTE FUNCTION public.enforce_one_lesson_plan_per_date();

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

  -- The class already has a plan for this date (written ahead, or a draft an
  -- admin created for a substitute): that is the plan to check in against.
  SELECT lp.id INTO v_lesson_plan_id
    FROM public.lesson_plans lp
    WHERE lp."classId" = p_class_id AND lp."scheduledDate" = p_scheduled_date AND lp."deletedAt" IS NULL
    LIMIT 1;

  IF v_lesson_plan_id IS NULL THEN
    INSERT INTO public.lesson_plans (
      "classId", "createdByTeacherId", "meetingNumber", "week", "scheduledDate", "topic", "isDraft"
    ) VALUES (
      p_class_id, p_teacher_id, p_meeting_number, p_week, p_scheduled_date, '(Belum diisi)', true
    )
    RETURNING id INTO v_lesson_plan_id;
  END IF;

  BEGIN
    INSERT INTO public.meetings ("lessonPlanId", "assignedTeacherId", "actualTeacherId", status)
    VALUES (v_lesson_plan_id, p_teacher_id, p_teacher_id, 'SCHEDULED')
    RETURNING id INTO v_meeting_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'ALREADY_CHECKED_IN';
  END;

  INSERT INTO public.check_ins ("meetingId", "teacherId", "isLate")
  VALUES (v_meeting_id, p_teacher_id, p_is_late);

  RETURN v_meeting_id;
END;
$$;
