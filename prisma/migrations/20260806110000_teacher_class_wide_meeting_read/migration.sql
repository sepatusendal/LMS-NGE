-- Bug found while building Substitute Teacher (context.md Section 6): a
-- substitute assigned to ONE meeting could only see that single meeting row
-- under RLS, not the class's other meetings. "Automatic Lesson Continuation"
-- (5.6/6.4) needs to see ALL of a class's meetings to compute which lesson
-- is COMPLETED and which is current — with the narrow per-meeting check, a
-- substitute's view showed every prior meeting as "not completed" and
-- resolved back to Meeting 1. Handover Summary (Section 7) has the same
-- problem reading a PREVIOUS meeting's teaching_reports, which never belongs
-- to the substitute directly.
--
-- Fix: once a teacher has any foothold in a class (owner, per-day schedule
-- override, or is assigned/actual on at least one of its meetings —
-- everything is_teacher_class() already checks), they can read ALL of that
-- class's meetings and meeting-scoped data, not just rows naming them
-- directly.

CREATE OR REPLACE FUNCTION public.is_teacher_meeting(target_meeting_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meetings m
    JOIN public.lesson_plans lp ON lp.id = m."lessonPlanId"
    WHERE m.id = target_meeting_id AND public.is_teacher_class(lp."classId")
  );
$$;

DROP POLICY IF EXISTS "teacher_read_own_meetings" ON public.meetings;
CREATE POLICY "teacher_read_own_meetings" ON public.meetings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lesson_plans lp
      WHERE lp.id = meetings."lessonPlanId" AND public.is_teacher_class(lp."classId")
    )
  );
