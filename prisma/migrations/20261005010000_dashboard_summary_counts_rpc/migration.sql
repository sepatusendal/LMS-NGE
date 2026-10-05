-- Two more dashboard reads that pulled far more rows than they needed through
-- PostgREST, and so paid the same per-row RLS helper cost (is_admin(),
-- is_coordinator(), is_teacher_class(), ... are SECURITY DEFINER and are
-- re-run for every row) described in 20261005000000_dashboard_stats_rpc.
-- Same approach: aggregate in ONE statement as the function owner (bypasses
-- RLS) behind an explicit admin/coordinator check, return only the numbers.

-- ComplianceAlert's "Daily Teaching Report" export sheet only needs, per
-- class, how many teaching reports exist and the class date of the latest
-- one. It used to get that by loading every teaching report ever filed (long
-- text columns included) plus the meetings, lesson plans, classes, schools,
-- teachers and every attendance row behind them — about a dozen requests on
-- every dashboard visit, the attendance chunks alone taking 2-6s each while
-- the rest of the dashboard was loading, and growing with every report.
-- Dated by the lesson plan's scheduledDate (the class date, like the Reports
-- page), and — as that code did — does not filter lesson_plans.deletedAt.
CREATE OR REPLACE FUNCTION public.dashboard_report_summary_by_class()
RETURNS TABLE (
  class_id UUID,
  report_count INT,
  latest_class_date DATE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- COALESCE matters: is_admin()/is_coordinator() return NULL (not FALSE)
  -- when there is no matching user row, and `IF NOT NULL` does not raise.
  IF NOT COALESCE(public.is_admin() OR public.is_coordinator(), FALSE) THEN
    RAISE EXCEPTION 'dashboard_report_summary_by_class: admin or coordinator only'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    lp."classId",
    count(*)::INT,
    max(lp."scheduledDate")
  FROM public.teaching_reports tr
  JOIN public.meetings m ON m.id = tr."meetingId"
  JOIN public.lesson_plans lp ON lp.id = m."lessonPlanId"
  GROUP BY lp."classId";
END;
$$;

-- Headcount for the dashboard's "Siswa Aktif" KPI card and revenue estimate:
-- real (REGULAR) students that are not soft-deleted, how many in total and
-- how many are active. Teacher-training trainees are excluded, as the client
-- query it replaces did with `excludeTeacherTraining`. That query downloaded
-- every student row (names, school join, ~80KB) just to count them.
CREATE OR REPLACE FUNCTION public.dashboard_student_counts()
RETURNS TABLE (
  total_count INT,
  active_count INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT COALESCE(public.is_admin() OR public.is_coordinator(), FALSE) THEN
    RAISE EXCEPTION 'dashboard_student_counts: admin or coordinator only'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    count(*)::INT,
    (count(*) FILTER (WHERE s."isActive"))::INT
  FROM public.students s
  WHERE s."deletedAt" IS NULL
    AND s."studentType" = 'REGULAR';
END;
$$;

-- SECURITY DEFINER bypasses RLS, so the admin/coordinator check above is the
-- only gate — keep EXECUTE away from PUBLIC and anon as well. Admins and
-- coordinators already have read access to every table involved
-- (admin_all_* and coordinator_read_* policies), so this exposes nothing
-- they could not select before.
REVOKE ALL ON FUNCTION public.dashboard_report_summary_by_class() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_report_summary_by_class() TO authenticated;

REVOKE ALL ON FUNCTION public.dashboard_student_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_student_counts() TO authenticated;
