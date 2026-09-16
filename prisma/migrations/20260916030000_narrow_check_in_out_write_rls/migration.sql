-- teacher_insert_own_check_ins / teacher_insert_own_check_outs still used
-- is_teacher_meeting() — the wide "has any foothold in this class" helper
-- (owns the class, OR ever assigned/actual teacher on ANY meeting of it, OR
-- has a schedule override/temporary-schedule row for ANY day/date of it,
-- not just the target meeting's). 20260912010000 already replaced this with
-- the narrower is_meeting_participant() (must be this meeting's actual
-- assignedTeacherId/actualTeacherId) for teaching_reports, after finding it
-- let a substitute teacher write reports for meetings they had nothing to
-- do with. check_ins/check_outs were never updated to match, leaving the
-- exact same gap open for attendance/duration data (not exploitable via the
-- normal UI, which always resolves its own meetingId, but reachable via a
-- direct API/RPC call).
DROP POLICY IF EXISTS "teacher_insert_own_check_ins" ON public.check_ins;
CREATE POLICY "teacher_insert_own_check_ins" ON public.check_ins FOR INSERT
  WITH CHECK (public.is_meeting_participant("meetingId") AND "teacherId" = public.current_teacher_id());

DROP POLICY IF EXISTS "teacher_insert_own_check_outs" ON public.check_outs;
CREATE POLICY "teacher_insert_own_check_outs" ON public.check_outs FOR INSERT
  WITH CHECK (
    public.is_meeting_participant("meetingId")
    AND "teacherId" = public.current_teacher_id()
    AND EXISTS (
      SELECT 1 FROM public.check_ins ci
      WHERE ci."meetingId" = check_outs."meetingId"
    )
  );
