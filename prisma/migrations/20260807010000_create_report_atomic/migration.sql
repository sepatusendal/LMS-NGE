-- C-3 (HIGH): createReport() in src/features/reports/queries.ts performed 4
-- sequential Supabase calls (insert teaching_reports -> insert
-- student_follow_ups -> insert progress_records -> update meetings.status)
-- each with an independent "if (error) throw". The Supabase JS client has no
-- client-side multi-statement transaction support, so a failure on the last
-- step (e.g. the meetings UPDATE) left the report/follow-ups/progress
-- records from the earlier steps committed — orphaned rows, a meeting stuck
-- in "checked_out" state, and a teacher retry that could create a duplicate
-- report.
--
-- Fix: move the whole write into a single plpgsql function. A function body
-- runs inside an implicit transaction, so any RAISE EXCEPTION (e.g. a bad
-- meeting id, or any INSERT/UPDATE failure) rolls back everything the
-- function already did in that call. The function is SECURITY INVOKER (not
-- DEFINER) so it runs with the calling teacher's privileges — every
-- SELECT/INSERT/UPDATE inside it is still filtered/checked by the existing
-- RLS policies on meetings / teaching_reports / student_follow_ups /
-- progress_records, exactly as if the client had issued the statements
-- directly.

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
  p_follow_ups JSONB DEFAULT '[]'::jsonb
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
BEGIN
  SELECT "assignedTeacherId", "substituteReason"
    INTO v_assigned_teacher_id, v_substitute_reason
    FROM public.meetings
    WHERE id = p_meeting_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meeting % not found or not accessible', p_meeting_id;
  END IF;

  v_is_substitute := p_original_teacher_id IS DISTINCT FROM v_assigned_teacher_id;

  INSERT INTO public.teaching_reports (
    "meetingId", "originalTeacherId", "substituteTeacherId", "replacementReason",
    "actualTeachingDate", "skills", "objectivesAchieved", "whatWentWell",
    "whatNeedsImprovement", "nextLessonNotes", "homeworkAssigned",
    "photoDriveFileId", "photoFileName"
  ) VALUES (
    p_meeting_id,
    v_assigned_teacher_id,
    CASE WHEN v_is_substitute THEN p_original_teacher_id ELSE NULL END,
    CASE WHEN v_is_substitute THEN v_substitute_reason ELSE NULL END,
    CURRENT_DATE,
    p_skills,
    NULLIF(p_objectives_achieved, '')::"ObjectivesAchieved",
    NULLIF(p_what_went_well, ''),
    NULLIF(p_what_needs_improvement, ''),
    NULLIF(p_next_lesson_notes, ''),
    NULLIF(p_homework_assigned, ''),
    NULLIF(p_photo_drive_file_id, ''),
    NULLIF(p_photo_file_name, '')
  )
  RETURNING id INTO v_report_id;

  IF jsonb_array_length(p_follow_ups) > 0 THEN
    INSERT INTO public.student_follow_ups ("teachingReportId", "studentId", "note")
    SELECT v_report_id, (f->>'studentId')::UUID, f->>'note'
    FROM jsonb_array_elements(p_follow_ups) AS f;
  END IF;

  SELECT array_agg(DISTINCT "studentId") INTO v_student_ids
    FROM public.attendances
    WHERE "meetingId" = p_meeting_id AND status IN ('PRESENT', 'LATE');

  IF v_student_ids IS NOT NULL AND array_length(v_student_ids, 1) > 0 THEN
    v_note := COALESCE(
      NULLIF(TRIM(p_what_went_well), ''),
      CASE p_objectives_achieved
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
  UUID, UUID, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_teaching_report(
  UUID, UUID, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB
) TO authenticated;
