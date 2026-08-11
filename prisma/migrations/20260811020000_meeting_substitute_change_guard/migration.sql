-- Security audit finding (pre-production review): both cancelSubstitute and
-- assignSubstituteForLessonPlan's "existing meeting" branch (src/features/
-- substitutes/queries.ts) SELECT check_ins first, then UPDATE actualTeacherId
-- in a separate round-trip — a classic TOCTOU. A check-in landing in that gap
-- (the substitute/teacher checking in right as an admin cancels/reassigns)
-- would silently reassign a meeting that already has a check-in recorded
-- against it. Close this atomically at the DB layer: once a meeting has a
-- check-in, only admin/service_role may change who's teaching it.

CREATE OR REPLACE FUNCTION public.enforce_no_substitute_change_after_checkin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF public.is_admin() OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF (NEW."actualTeacherId" IS DISTINCT FROM OLD."actualTeacherId"
      OR NEW."substituteReason" IS DISTINCT FROM OLD."substituteReason")
     AND EXISTS (SELECT 1 FROM public.check_ins ci WHERE ci."meetingId" = OLD.id)
  THEN
    RAISE EXCEPTION 'meetings: cannot change the assigned/substitute teacher after check-in';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_no_substitute_change_after_checkin ON public.meetings;
CREATE TRIGGER enforce_no_substitute_change_after_checkin
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE PROCEDURE public.enforce_no_substitute_change_after_checkin();
