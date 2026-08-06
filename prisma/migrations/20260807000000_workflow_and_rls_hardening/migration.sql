-- Security audit hardening: three findings.
--
-- B-4 (HIGH): "teacher_update_own_check_in_photo" (20260806120000) is
-- ownership-scoped only — a teacher can PATCH any column on their own
-- check_ins row (checkInTime, isLate, gpsLat/Lng, teacherId, meetingId...),
-- not just the photoDriveFileId/photoFileName the app actually sends. Add a
-- BEFORE UPDATE trigger that rejects any change to a protected column unless
-- the actor is admin or service_role. The RLS policy itself stays as-is —
-- this is a column-level backstop on top of the existing row-level check.
--
-- B-1/B-3/E-1 (CRITICAL): the check-in -> attendance -> check-out -> report
-- sequence (context.md Section 4/5) is only enforced by the UI. At the DB
-- layer, check_outs INSERT only checks meeting ownership (not that a
-- check_ins row exists), and teaching_reports INSERT only checks meeting
-- ownership (not that a check_outs row exists). A teacher could submit a
-- report — or a check-out — via a crafted request without ever completing
-- the prior step. Add EXISTS guards to both WITH CHECK clauses so the DB
-- itself enforces the workflow order, independent of the UI.
--
-- B-2 (HIGH): is_teacher_class() was broadened in 20260806100000 to also
-- return true for a teacher holding a one-day class_schedule_override
-- (Houstan/Canberra-style split classes). "teacher_insert_own_lesson_plans"
-- (20260806071000) reuses is_teacher_class() for its WITH CHECK, so that
-- broadening silently let a one-day substitute author lesson plans for the
-- WHOLE class, not just their override day — violating "primary teacher
-- owns the class's lesson plans" (context.md 5.5). is_teacher_class() itself
-- is left untouched (substitutes correctly need it for read/attendance
-- access); only the lesson_plans INSERT policy is narrowed to check primary
-- teacher ownership (classes.teacherId) directly. The companion
-- "teacher_update_own_lesson_plans" policy already keys off
-- "createdByTeacherId" = current_teacher_id() (never called is_teacher_class
-- to begin with), so it needs no change.

-- ─────────────────────────────────────────────────────────────
-- B-4: column-level protection on check_ins UPDATE
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.enforce_check_in_photo_only_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Admin (via RLS-bypassing "admin_all_check_ins" policy) and the
  -- service_role (server-side jobs) may update any column.
  IF public.is_admin() OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW."id" IS DISTINCT FROM OLD."id"
     OR NEW."meetingId" IS DISTINCT FROM OLD."meetingId"
     OR NEW."teacherId" IS DISTINCT FROM OLD."teacherId"
     OR NEW."checkInTime" IS DISTINCT FROM OLD."checkInTime"
     OR NEW."gpsLat" IS DISTINCT FROM OLD."gpsLat"
     OR NEW."gpsLng" IS DISTINCT FROM OLD."gpsLng"
     OR NEW."notes" IS DISTINCT FROM OLD."notes"
     OR NEW."isLate" IS DISTINCT FROM OLD."isLate"
     OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
  THEN
    RAISE EXCEPTION 'check_ins: only photoDriveFileId/photoFileName may be updated by a teacher';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_check_in_photo_only_update ON public.check_ins;
CREATE TRIGGER enforce_check_in_photo_only_update
  BEFORE UPDATE ON public.check_ins
  FOR EACH ROW EXECUTE PROCEDURE public.enforce_check_in_photo_only_update();

-- ─────────────────────────────────────────────────────────────
-- B-1/B-3/E-1: DB-level workflow-state enforcement
-- ─────────────────────────────────────────────────────────────

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

DROP POLICY IF EXISTS "teacher_insert_own_teaching_reports" ON public.teaching_reports;
CREATE POLICY "teacher_insert_own_teaching_reports" ON public.teaching_reports FOR INSERT
  WITH CHECK (
    public.is_teacher_meeting("meetingId")
    AND EXISTS (
      SELECT 1 FROM public.check_outs co
      WHERE co."meetingId" = teaching_reports."meetingId"
    )
  );

-- ─────────────────────────────────────────────────────────────
-- B-2: lesson_plans INSERT restricted to primary teacher ownership
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "teacher_insert_own_lesson_plans" ON public.lesson_plans;
CREATE POLICY "teacher_insert_own_lesson_plans" ON public.lesson_plans FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = "classId" AND c."teacherId" = public.current_teacher_id()
    )
    AND "createdByTeacherId" = public.current_teacher_id()
  );
