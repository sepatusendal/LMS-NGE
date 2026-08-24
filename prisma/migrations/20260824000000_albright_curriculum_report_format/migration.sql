-- Support for the "Albright" curriculum's teaching-record format, which
-- differs from the standard Daily Teaching Report: instead of
-- objectives/whatWentWell/whatNeedsImprovement/actionPlan/nextLessonNotes,
-- tutors on this curriculum log Language & Skills Focus, Activities, and
-- Resources per session (previously kept in a separate spreadsheet handed
-- out by Albright — see Nufa_Teaching_Records reference file).
--
--   1. curriculums."reportFormat" — STANDARD (default) | ALBRIGHT. Drives
--      which form (lesson plan + teaching report) is rendered for a class,
--      via Class -> Curriculum.
--   2. teaching_reports gets 3 new nullable columns for the Albright fields.
--      "homeworkAssigned" (already existed) is reused as-is for Albright's
--      "Homework" field. "activitiesLog" is a new column rather than
--      reusing "summary", since "summary" already feeds the dashboard's
--      "Catatan Terbaru" widget and Albright's Activities narrative is much
--      longer freeform text that doesn't belong there.

CREATE TYPE "CurriculumReportFormat" AS ENUM ('STANDARD', 'ALBRIGHT');

ALTER TABLE public.curriculums
  ADD COLUMN "reportFormat" "CurriculumReportFormat" NOT NULL DEFAULT 'STANDARD';

-- Backfill the existing "Albright" curriculum row (created ahead of this
-- feature, not yet assigned to any class) to the new format.
UPDATE public.curriculums SET "reportFormat" = 'ALBRIGHT' WHERE name = 'Albright';

ALTER TABLE public.teaching_reports ADD COLUMN "languageSkillsFocus" TEXT;
ALTER TABLE public.teaching_reports ADD COLUMN "activitiesLog" TEXT;
ALTER TABLE public.teaching_reports ADD COLUMN "resourcesUsed" TEXT;

-- Recreate create_teaching_report with 3 new trailing DEFAULT-ed params for
-- the Albright fields. Old signature dropped first per the established
-- pattern (see 20260819010000_report_objectives_and_action_plan) — adding
-- trailing DEFAULT params would otherwise overload rather than replace it.
DROP FUNCTION IF EXISTS public.create_teaching_report(
  UUID, UUID, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, TEXT
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
  p_action_plan TEXT DEFAULT NULL,
  p_language_skills_focus TEXT DEFAULT NULL,
  p_activities_log TEXT DEFAULT NULL,
  p_resources_used TEXT DEFAULT NULL
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
    "photoDriveFileId", "photoFileName", "actionPlan",
    "languageSkillsFocus", "activitiesLog", "resourcesUsed"
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
    NULLIF(p_action_plan, ''),
    NULLIF(p_language_skills_focus, ''),
    NULLIF(p_activities_log, ''),
    NULLIF(p_resources_used, '')
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
      NULLIF(TRIM(p_activities_log), ''),
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
  UUID, UUID, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_teaching_report(
  UUID, UUID, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, TEXT, TEXT, TEXT, TEXT
) TO authenticated;
