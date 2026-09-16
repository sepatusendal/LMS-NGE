-- check_ins.isLate was previously computed entirely client-side
-- (computeIsLate() in meetings/queries.ts, using `new Date()` on the
-- tutor's own device) and inserted as-is by both startClass() and the
-- check_in_with_draft_plan() RPC — nothing on the server ever recomputed
-- it. A tutor who is actually late can turn their phone's clock back a few
-- minutes right before checking in and the "Terlambat" flag (used in
-- monitoring/tutor performance views) will simply never be set. Close this
-- by deriving isLate from the server clock in a BEFORE INSERT trigger on
-- check_ins, which overrides whatever the client sends — the RPC/client
-- can keep passing a value (harmless, ignored) so no call-site signature
-- needs to change.

-- Resolves "what time does class X start today" using the same precedence
-- the client already used (temporary schedule > per-day override > normal
-- recurring slot), for a given class + calendar date.
CREATE OR REPLACE FUNCTION public.resolve_effective_start_time(p_class_id UUID, p_date DATE)
RETURNS TIME
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_dow INT := EXTRACT(DOW FROM p_date);
  v_start TEXT;
BEGIN
  SELECT "startTime" INTO v_start
  FROM public.class_temporary_schedules
  WHERE "classId" = p_class_id AND "date" = p_date
  LIMIT 1;
  IF v_start IS NOT NULL THEN RETURN v_start::TIME; END IF;

  SELECT "startTime" INTO v_start
  FROM public.class_schedule_overrides
  WHERE "classId" = p_class_id AND "dayOfWeek" = v_dow
  LIMIT 1;
  IF v_start IS NOT NULL THEN RETURN v_start::TIME; END IF;

  SELECT "startTime" INTO v_start
  FROM public.class_schedule_slots
  WHERE "classId" = p_class_id AND "dayOfWeek" = v_dow
  LIMIT 1;
  RETURN v_start::TIME;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_ins_set_is_late()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_class_id UUID;
  v_now_jakarta TIMESTAMP := (now() AT TIME ZONE 'Asia/Jakarta');
  v_start_time TIME;
  v_grace_minutes CONSTANT INT := 10;
BEGIN
  SELECT lp."classId" INTO v_class_id
  FROM public.meetings m
  JOIN public.lesson_plans lp ON lp.id = m."lessonPlanId"
  WHERE m.id = NEW."meetingId";

  v_start_time := public.resolve_effective_start_time(v_class_id, v_now_jakarta::DATE);

  NEW."isLate" := v_start_time IS NOT NULL
    AND v_now_jakarta::TIME > (v_start_time + (v_grace_minutes || ' minutes')::INTERVAL);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_ins_set_is_late_trigger ON public.check_ins;
CREATE TRIGGER check_ins_set_is_late_trigger
  BEFORE INSERT ON public.check_ins
  FOR EACH ROW
  EXECUTE FUNCTION public.check_ins_set_is_late();
