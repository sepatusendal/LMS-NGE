-- check_ins_set_is_late() (20260916020000) used now() as both "today" (for
-- resolving the effective schedule) and "the current time" (for the late
-- comparison). That's correct for a live check-in, where checkInTime is
-- always "right now" — but backfill_meeting_admin() (prisma/migrations
-- 20260915xxx) inserts check_ins with an explicit, admin-chosen historical
-- "checkInTime" for a past date/time being retroactively recorded. The
-- trigger fired on that insert too (triggers apply to every INSERT
-- regardless of caller) and recomputed isLate against *today's* schedule
-- and *today's* clock instead of the backfilled date's — silently
-- overwriting the admin's deliberately-chosen isLate value with a
-- nonsensical result for a session that may have happened weeks ago.
--
-- Fix: derive both the reference date and the reference time from
-- NEW."checkInTime" instead of now(). Column defaults (checkInTime DEFAULT
-- now()) are already applied to NEW before a BEFORE INSERT trigger runs, so
-- this is a no-op behavior change for the live check-in path (checkInTime
-- there IS "now" at insert time) and the actual fix for backfill.
CREATE OR REPLACE FUNCTION public.check_ins_set_is_late()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_class_id UUID;
  v_reference_jakarta TIMESTAMP := (NEW."checkInTime" AT TIME ZONE 'Asia/Jakarta');
  v_start_time TIME;
  v_grace_minutes CONSTANT INT := 10;
BEGIN
  SELECT lp."classId" INTO v_class_id
  FROM public.meetings m
  JOIN public.lesson_plans lp ON lp.id = m."lessonPlanId"
  WHERE m.id = NEW."meetingId";

  v_start_time := public.resolve_effective_start_time(v_class_id, v_reference_jakarta::DATE);

  NEW."isLate" := v_start_time IS NOT NULL
    AND v_reference_jakarta::TIME > (v_start_time + (v_grace_minutes || ' minutes')::INTERVAL);

  RETURN NEW;
END;
$$;
