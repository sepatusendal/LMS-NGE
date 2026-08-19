-- Per-objective achievement tracking + Action Plan on Daily Teaching Report.
--
-- Previously "objectivesAchieved" (YES/PARTIALLY/NO) was a single flat enum
-- with no indication of *which* learning objective(s) weren't met, and there
-- was no dedicated place for a teacher to write a concrete action plan when
-- logging a "Needs Improvement" note. This adds:
--   1. teaching_reports."actionPlan" — free text, required client-side
--      whenever whatNeedsImprovement is filled in.
--   2. report_learning_objectives — one row per lesson-plan objective,
--      snapshotted at report time (objectives are freeform strings on
--      lesson_plans.learningObjectives, not a normalized/id'd table, so we
--      store the text directly rather than an FK) with an achieved flag.
--      "objectivesAchieved" is now derived server-side from this breakdown
--      instead of being picked directly by the teacher.

ALTER TABLE public.teaching_reports ADD COLUMN "actionPlan" TEXT;

CREATE TABLE public.report_learning_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "teachingReportId" UUID NOT NULL REFERENCES public.teaching_reports(id),
  "objectiveText" TEXT NOT NULL,
  achieved BOOLEAN NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);

CREATE INDEX "report_learning_objectives_teachingReportId_idx"
  ON public.report_learning_objectives ("teachingReportId");

ALTER TABLE public.report_learning_objectives ENABLE ROW LEVEL SECURITY;

-- Mirrors the existing student_follow_ups policies (see
-- 20260806060000_auth_trigger_and_rls/migration.sql) — read/insert gated on
-- the teacher owning the meeting behind the parent teaching_reports row.
CREATE POLICY "admin_all_report_learning_objectives" ON public.report_learning_objectives FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "coordinator_read_report_learning_objectives" ON public.report_learning_objectives FOR SELECT
  USING (public.is_coordinator());
CREATE POLICY "teacher_read_own_report_learning_objectives" ON public.report_learning_objectives FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.teaching_reports tr
    WHERE tr.id = report_learning_objectives."teachingReportId" AND public.is_teacher_meeting(tr."meetingId")
  ));
CREATE POLICY "teacher_insert_own_report_learning_objectives" ON public.report_learning_objectives FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.teaching_reports tr
    WHERE tr.id = report_learning_objectives."teachingReportId" AND public.is_teacher_meeting(tr."meetingId")
  ));

-- Recreate create_teaching_report with the new p_objectives / p_action_plan
-- params. The old signature is dropped first since adding trailing
-- DEFAULT-ed params would otherwise overload rather than replace it.
DROP FUNCTION IF EXISTS public.create_teaching_report(
  UUID, UUID, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB
);

CREATE OR REPLACE FUNCTION public.create_teaching_report(
  p_meeting_id UUID,
  p_original_teacher_id UUID,
  p_skills TEXT[],
  p_objectives_achieved TEXT DEFAULT NULL,
  p_what_went_well TEXT DEFAULT NULL,
  p_what_needs_improvement TEXT DEFAULT NULL,
  p_next_lesson_notes TEXT DEFAULT NULL,
  p_homework_assigned TEXT DEFAULT NULL,
  p_photo_drive_file_id TEXT DEFAULT NULL,
  p_photo_file_name TEXT DEFAULT NULL,
  p_follow_ups JSONB DEFAULT '[]'::jsonb,
  p_objectives JSONB DEFAULT '[]'::jsonb,
  p_action_plan TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_assigned_teacher_id UUID;
  v_substitute_reason TEXT;
  v_is_substitute BOOLEAN;
  v_report_id UUID;
  v_note TEXT;
  v_skill_areas TEXT[];
  v_student_ids UUID[];
  v_objectives_total INT;
  v_objectives_achieved_count INT;
  v_derived_objectives_achieved TEXT;
BEGIN
  SELECT "assignedTeacherId", "substituteReason"
    INTO v_assigned_teacher_id, v_substitute_reason
    FROM public.meetings
    WHERE id = p_meeting_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meeting % not found or not accessible', p_meeting_id;
  END IF;

  v_is_substitute := p_original_teacher_id IS DISTINCT FROM v_assigned_teacher_id;

  -- Derive the flat objectivesAchieved status from the per-objective
  -- breakdown server-side, rather than trusting a client-computed enum, so
  -- the summary badge can never drift from the checklist it's built from.
  v_objectives_total := jsonb_array_length(p_objectives);
  IF v_objectives_total > 0 THEN
    SELECT count(*) FILTER (WHERE (o->>'achieved')::boolean)
      INTO v_objectives_achieved_count
      FROM jsonb_array_elements(p_objectives) AS o;

    v_derived_objectives_achieved := CASE
      WHEN v_objectives_achieved_count = v_objectives_total THEN 'YES'
      WHEN v_objectives_achieved_count = 0 THEN 'NO'
      ELSE 'PARTIALLY'
    END;
  ELSE
    v_derived_objectives_achieved := NULLIF(p_objectives_achieved, '');
  END IF;

  INSERT INTO public.teaching_reports (
    "meetingId", "originalTeacherId", "substituteTeacherId", "replacementReason",
    "actualTeachingDate", "skills", "objectivesAchieved", "whatWentWell",
    "whatNeedsImprovement", "nextLessonNotes", "homeworkAssigned",
    "photoDriveFileId", "photoFileName", "actionPlan"
  ) VALUES (
    p_meeting_id,
    v_assigned_teacher_id,
    CASE WHEN v_is_substitute THEN p_original_teacher_id ELSE NULL END,
    CASE WHEN v_is_substitute THEN v_substitute_reason ELSE NULL END,
    CURRENT_DATE,
    p_skills,
    v_derived_objectives_achieved::"ObjectivesAchieved",
    NULLIF(p_what_went_well, ''),
    NULLIF(p_what_needs_improvement, ''),
    NULLIF(p_next_lesson_notes, ''),
    NULLIF(p_homework_assigned, ''),
    NULLIF(p_photo_drive_file_id, ''),
    NULLIF(p_photo_file_name, ''),
    NULLIF(p_action_plan, '')
  )
  RETURNING id INTO v_report_id;

  IF jsonb_array_length(p_follow_ups) > 0 THEN
    INSERT INTO public.student_follow_ups ("teachingReportId", "studentId", "note")
    SELECT v_report_id, (f->>'studentId')::UUID, f->>'note'
    FROM jsonb_array_elements(p_follow_ups) AS f;
  END IF;

  IF v_objectives_total > 0 THEN
    INSERT INTO public.report_learning_objectives ("teachingReportId", "objectiveText", achieved)
    SELECT v_report_id, o->>'text', (o->>'achieved')::boolean
    FROM jsonb_array_elements(p_objectives) AS o;
  END IF;

  SELECT array_agg(DISTINCT "studentId") INTO v_student_ids
    FROM public.attendances
    WHERE "meetingId" = p_meeting_id AND status IN ('PRESENT', 'LATE');

  IF v_student_ids IS NOT NULL AND array_length(v_student_ids, 1) > 0 THEN
    v_note := COALESCE(
      NULLIF(TRIM(p_what_went_well), ''),
      CASE v_derived_objectives_achieved
        WHEN 'YES' THEN 'Tercapai'
        WHEN 'PARTIALLY' THEN 'Sebagian'
        WHEN 'NO' THEN 'Belum Tercapai'
        ELSE NULL
      END,
      'Progress tercatat dari Daily Teaching Report.'
    );

    v_skill_areas := CASE WHEN array_length(p_skills, 1) > 0 THEN p_skills ELSE ARRAY[NULL]::TEXT[] END;

    INSERT INTO public.progress_records ("studentId", "teachingReportId", "skillArea", "note")
    SELECT s, v_report_id, sk, v_note
    FROM unnest(v_student_ids) AS s
    CROSS JOIN unnest(v_skill_areas) AS sk;
  END IF;

  UPDATE public.meetings SET status = 'COMPLETED' WHERE id = p_meeting_id;

  RETURN v_report_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_teaching_report(
  UUID, UUID, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_teaching_report(
  UUID, UUID, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, TEXT
) TO authenticated;
