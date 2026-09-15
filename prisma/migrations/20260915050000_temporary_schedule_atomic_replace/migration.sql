-- updateTemporarySchedule() (temporary-schedules/queries.ts) replaces a
-- batch's rows with DELETE then a separate INSERT — two independent
-- round-trips, not one transaction. If the INSERT fails for any reason
-- (a real 23505 conflict from a race with another admin creating a
-- clashing schedule between the pre-check and this call, a dropped
-- connection, anything) after the DELETE already succeeded, the batch's
-- old rows are gone and the new ones never landed — the temporary
-- schedule silently disappears instead of being edited. Wrap both steps
-- in one PL/pgSQL function so they commit or roll back together.
CREATE OR REPLACE FUNCTION public.replace_temporary_schedule_batch(
  p_batch_id UUID,
  p_rows JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.class_temporary_schedules WHERE "batchId" = p_batch_id;

  INSERT INTO public.class_temporary_schedules (
    "batchId", "classId", "date", "startTime", "endTime", "label", "teacherId"
  )
  SELECT
    p_batch_id,
    (r->>'classId')::UUID,
    (r->>'date')::DATE,
    r->>'startTime',
    r->>'endTime',
    NULLIF(r->>'label', ''),
    NULLIF(r->>'teacherId', '')::UUID
  FROM jsonb_array_elements(p_rows) AS r;
END;
$$;

-- SECURITY INVOKER — relies entirely on class_temporary_schedules' existing
-- admin_all_class_temporary_schedules RLS policy (FOR ALL), same as every
-- other write to this table; a non-admin caller's DELETE silently matches
-- zero rows and the INSERT is rejected by RLS, same fail-safe shape the
-- direct-table calls already had.
REVOKE ALL ON FUNCTION public.replace_temporary_schedule_batch(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_temporary_schedule_batch(UUID, JSONB) TO authenticated;
