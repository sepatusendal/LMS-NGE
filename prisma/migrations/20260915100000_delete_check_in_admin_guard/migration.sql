-- deleteCheckInAdmin() (meetings/admin-queries.ts, MeetingAdminDialog's
-- standalone "Delete" button on the check-in card) deleted check_ins
-- directly with no check on whether a check_outs row for the same meeting
-- still exists. check_ins/check_outs have no FK to each other (both just
-- reference meetingId independently), so this silently produces a meeting
-- that is "checked out" with no check-in — meetingStatus derivation in both
-- fetchTodayClasses() (meetings/queries.ts) and fetchStatusBoard()
-- (monitoring/queries.ts) checks hasCheckOut before hasCheckIn, so the
-- tutor's own /absensi card renders the "Check-out" badge with no check-in
-- time shown at all — this is exactly the state a tutor (Pak Edy) reported
-- confusion over. The same failure mode could previously happen by accident
-- when the OLD non-atomic reset_meeting_admin (pre-20260915070000) had its
-- 4 parallel deletes partially fail; that path is now atomic, but this
-- standalone button is a second, still-open way to reach the same bad
-- state. Guard it: refuse the delete (pointing the admin at "Reset
-- Meeting" instead, which correctly clears both rows together) whenever a
-- check-out already exists for the meeting.
CREATE OR REPLACE FUNCTION public.delete_check_in_admin(p_check_in_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_meeting_id UUID;
BEGIN
  SELECT "meetingId" INTO v_meeting_id FROM public.check_ins WHERE id = p_check_in_id;
  IF v_meeting_id IS NULL THEN
    RAISE EXCEPTION 'CHECK_IN_NOT_FOUND';
  END IF;

  IF EXISTS (SELECT 1 FROM public.check_outs WHERE "meetingId" = v_meeting_id) THEN
    RAISE EXCEPTION 'CHECKOUT_EXISTS';
  END IF;

  DELETE FROM public.check_ins WHERE id = p_check_in_id;
END;
$$;

-- SECURITY INVOKER — relies on the existing admin_all_check_ins RLS policy
-- (FOR ALL), same as the direct-table call this replaces.
REVOKE ALL ON FUNCTION public.delete_check_in_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_check_in_admin(UUID) TO authenticated;
