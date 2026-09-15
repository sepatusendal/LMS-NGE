-- syncScheduleSlots() (classes/queries.ts, called from createClassRecord/
-- updateClassRecord) does DELETE class_schedule_slots, DELETE
-- class_schedule_overrides, then UPSERT class_schedule_slots — three
-- separate round-trips, not one transaction. If the upsert fails after the
-- two deletes already succeeded (a race with another admin's conflicting
-- change slipping past the app-level pre-check, a dropped connection,
-- anything), the class is left with schedule slots removed for its dropped
-- days but the new/changed days' slots never written — a class can end up
-- silently missing a day it was supposed to still meet on, or with a
-- kept day's time never actually updated. Same class of bug as
-- replace_temporary_schedule_batch (20260915050000); same fix shape.
CREATE OR REPLACE FUNCTION public.sync_class_schedule_slots(
  p_class_id UUID,
  p_days INT[],
  p_slots JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- p_days empty ("<> ALL" over an empty array is vacuously true for every
  -- row) correctly deletes every existing slot/override, matching the old
  -- client-side "-1 sentinel" behavior for a class with no days selected.
  DELETE FROM public.class_schedule_slots
    WHERE "classId" = p_class_id AND "dayOfWeek" <> ALL(p_days);

  -- A day dropped from the class's schedule can leave a stale teacher
  -- override behind (keyed by classId+dayOfWeek independent of whether a
  -- slot still exists for that day) — see syncScheduleSlots()'s own comment.
  DELETE FROM public.class_schedule_overrides
    WHERE "classId" = p_class_id AND "dayOfWeek" <> ALL(p_days);

  INSERT INTO public.class_schedule_slots ("classId", "dayOfWeek", "startTime", "endTime")
  SELECT p_class_id, (s->>'dayOfWeek')::INT, s->>'startTime', s->>'endTime'
  FROM jsonb_array_elements(p_slots) AS s
  ON CONFLICT ("classId", "dayOfWeek") DO UPDATE SET
    "startTime" = EXCLUDED."startTime",
    "endTime" = EXCLUDED."endTime";
END;
$$;

-- SECURITY INVOKER — relies on the existing admin_all_class_schedule_slots
-- and admin_all_class_schedule_overrides RLS policies (both FOR ALL), same
-- as the direct-table calls this replaces.
REVOKE ALL ON FUNCTION public.sync_class_schedule_slots(UUID, INT[], JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_class_schedule_slots(UUID, INT[], JSONB) TO authenticated;
