-- Reverts 20260916030000. That migration narrowed check_ins/check_outs
-- INSERT policies from is_teacher_meeting() (any foothold in the class) to
-- is_meeting_participant() (must already be this specific meeting row's
-- assignedTeacherId/actualTeacherId) — mirroring the teaching_reports fix
-- from 20260912010000.
--
-- On closer read this introduces a real regression that teaching_reports
-- doesn't share: check_ins is the FIRST write against a meeting row for a
-- teaching session, and startClass() (meetings/queries.ts) does NOT update
-- actualTeacherId when it finds a meeting row that already exists for the
-- lessonPlanId (it only sets it on the INSERT path, when creating a brand
-- new meeting). A meeting row can already exist with a stale
-- assignedTeacherId/actualTeacherId in ordinary, reachable situations — a
-- prior check-in attempt that stalled before check_ins was ever inserted,
-- or an admin's reset_meeting_admin() (which deliberately leaves
-- assignedTeacherId/actualTeacherId untouched, only clearing status and the
-- child rows). If a *different* teacher then legitimately needs to check
-- into that same lessonPlanId (a per-day override/temporary-schedule
-- substitute who never went through the admin "reassign tutor" flow, which
-- is the only path that updates actualTeacherId ahead of check-in), their
-- check_ins INSERT now fails under is_meeting_participant() even though
-- they have every right to teach this class today — the exact
-- "legitimate tutor blocked" failure mode this whole audit pass exists to
-- eliminate, not reintroduce.
--
-- teaching_reports doesn't have this problem because by the time a report
-- is filed, checking-in has already necessarily set actualTeacherId
-- correctly (or assignSubstituteForLessonPlan set it ahead of time) — there
-- is no equivalent "meeting row pre-exists with someone else's id and
-- nothing updates it" gap at that later stage. check_ins is exactly where
-- that gap lives, so it needs the wider check. A correct narrow fix would
-- have startClass() atomically reconcile actualTeacherId at check-in time
-- via a SECURITY DEFINER RPC authorized by class-level schedule access
-- (mirroring is_teacher_class()) rather than by the meeting row's current,
-- possibly-stale contents — left as a follow-up; reverting now removes the
-- regression risk immediately since the gap being closed was already
-- established (20260912010000's own comment) as not reachable through the
-- normal UI, unlike this one.
DROP POLICY IF EXISTS "teacher_insert_own_check_ins" ON public.check_ins;
CREATE POLICY "teacher_insert_own_check_ins" ON public.check_ins FOR INSERT
  WITH CHECK (public.is_teacher_meeting("meetingId") AND "teacherId" = public.current_teacher_id());

DROP POLICY IF EXISTS "teacher_insert_own_check_outs" ON public.check_outs;
CREATE POLICY "teacher_insert_own_check_outs" ON public.check_outs FOR INSERT
  WITH CHECK (
    public.is_teacher_meeting("meetingId")
    AND "teacherId" = public.current_teacher_id()
    AND EXISTS (
      SELECT 1 FROM public.check_ins ci
      WHERE ci."meetingId" = check_outs."meetingId"
    )
  );
