-- check_ins had no UPDATE policy for Teacher at all (intentionally immutable
-- — checkInTime/isLate must never change after submission). The classroom
-- photo feature needs to attach a Drive file *after* check-in already
-- happened, so the Drive upload was succeeding while the DB link silently
-- never saved (Postgrest returns 0 rows affected, not an error, when RLS
-- blocks every row). Scope this narrowly to the teacher who owns the
-- meeting — the app only ever sends photoDriveFileId/photoFileName in this
-- update path, but nothing at the RLS layer stops a crafted request from
-- touching other columns, so treat this as ownership-scoped, not
-- column-scoped.

CREATE POLICY "teacher_update_own_check_in_photo" ON public.check_ins FOR UPDATE
  USING (public.is_teacher_meeting("meetingId") AND "teacherId" = public.current_teacher_id())
  WITH CHECK (public.is_teacher_meeting("meetingId") AND "teacherId" = public.current_teacher_id());
