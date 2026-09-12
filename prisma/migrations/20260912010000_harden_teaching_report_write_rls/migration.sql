-- Audit finding: is_teacher_meeting()/is_teacher_class() were deliberately
-- widened (20260806100000, 20260806110000, 20260912000100) so a substitute
-- teacher reached only via a ClassScheduleOverride or class_temporary_schedules
-- row gets *read* access to everything on that class, not just meetings that
-- directly name them. That's correct for reads, but teaching_reports' write
-- policies (INSERT, UPDATE, and the two child-table DELETE policies used by
-- update_teaching_report()) reuse the same broad check — so any teacher with
-- ANY foothold on a class (even an override for an unrelated weekday, or a
-- temp schedule for an unrelated date) can currently INSERT/UPDATE/DELETE a
-- teaching report for a meeting they never checked into or out of, and
-- create_teaching_report() additionally trusts the caller-supplied
-- p_original_teacher_id for attribution without checking it matches who's
-- actually calling. Not reachable through the normal UI (which always sends
-- the caller's own id for a meeting it already resolved as theirs), but a
-- real RLS/RPC gap once a client can call the API directly.
--
-- Fix: a new, narrower helper — the *pre-widening* is_teacher_meeting()
-- definition from 20260806060000, kept separate so the broad read-access
-- widening for other tables is untouched — used only for teaching_reports'
-- write paths. Plus explicit identity checks inside create_teaching_report()
-- so attribution can't be forged even by someone who does legitimately
-- participate in the meeting.

CREATE OR REPLACE FUNCTION public.is_meeting_participant(target_meeting_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = target_meeting_id
      AND (m."assignedTeacherId" = public.current_teacher_id() OR m."actualTeacherId" = public.current_teacher_id())
  );
$$;

DROP POLICY IF EXISTS "teacher_insert_own_teaching_reports" ON public.teaching_reports;
CREATE POLICY "teacher_insert_own_teaching_reports" ON public.teaching_reports FOR INSERT
  WITH CHECK (
    public.is_meeting_participant("meetingId")
    AND EXISTS (
      SELECT 1 FROM public.check_outs co
      WHERE co."meetingId" = teaching_reports."meetingId"
    )
  );

DROP POLICY IF EXISTS "teacher_update_own_teaching_reports" ON public.teaching_reports;
CREATE POLICY "teacher_update_own_teaching_reports" ON public.teaching_reports FOR UPDATE
  USING (
    public.is_meeting_participant("meetingId")
    AND "actualTeachingDate" >= CURRENT_DATE - INTERVAL '7 days'
  )
  WITH CHECK (
    public.is_meeting_participant("meetingId")
    AND "actualTeachingDate" >= CURRENT_DATE - INTERVAL '7 days'
  );

DROP POLICY IF EXISTS "teacher_delete_own_report_learning_objectives" ON public.report_learning_objectives;
CREATE POLICY "teacher_delete_own_report_learning_objectives" ON public.report_learning_objectives FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.teaching_reports tr
    WHERE tr.id = report_learning_objectives."teachingReportId" AND public.is_meeting_participant(tr."meetingId")
  ));

DROP POLICY IF EXISTS "teacher_delete_own_student_follow_ups" ON public.student_follow_ups;
CREATE POLICY "teacher_delete_own_student_follow_ups" ON public.student_follow_ups FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.teaching_reports tr
    WHERE tr.id = student_follow_ups."teachingReportId" AND public.is_meeting_participant(tr."meetingId")
  ));

-- create_teaching_report(): identical to 20260824000000's final version,
-- with two RAISE EXCEPTION identity guards added right after the meeting
-- lookup — RLS above gates *which meeting* an INSERT may target, but not
-- the client-supplied p_original_teacher_id baked into the row's
-- originalTeacherId/substituteTeacherId attribution, so that still needs
-- its own check here.
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
  v_actual_teacher_id UUID;
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
  SELECT "assignedTeacherId", "actualTeacherId", "substituteReason"
    INTO v_assigned_teacher_id, v_actual_teacher_id, v_substitute_reason
    FROM public.meetings
    WHERE id = p_meeting_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meeting % not found or not accessible', p_meeting_id;
  END IF;

  IF public.current_teacher_id() IS DISTINCT FROM v_assigned_teacher_id
     AND public.current_teacher_id() IS DISTINCT FROM v_actual_teacher_id THEN
    RAISE EXCEPTION 'Anda bukan guru yang mengajar meeting ini';
  END IF;

  IF p_original_teacher_id IS DISTINCT FROM public.current_teacher_id() THEN
    RAISE EXCEPTION 'Tidak bisa mengisi laporan atas nama guru lain';
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
