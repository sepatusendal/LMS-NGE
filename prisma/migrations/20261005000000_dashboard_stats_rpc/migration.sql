-- The admin dashboard's "Daily Teaching Report" card (fetchReportStats) and
-- its attendance/completion analytics cards (fetchAnalytics) used to read
-- lesson_plans / meetings / check_outs / teaching_reports / attendances
-- straight through PostgREST. Every one of those tables is protected by RLS
-- policies built on SECURITY DEFINER helpers (is_admin(), is_coordinator(),
-- is_teacher_class(), is_teacher_meeting()), which Postgres cannot inline and
-- re-runs for every row it touches — including every attendance row. A
-- 14-day window of ~100 sessions (~1.3k attendances) spent ~2.2s in the
-- database on that alone, and with the dashboard firing dozens of requests
-- at once it crossed the 8s statement_timeout of the `authenticated` role,
-- so both cards rendered "failed to load" (analytics showed "canceling
-- statement due to statement timeout"). The cost also grows with every
-- session, so a quiet window only hid the problem.
--
-- These two functions do the same aggregation in ONE statement as the
-- function owner (which bypasses RLS) after an explicit admin/coordinator
-- check, and return one small row per day. The client keeps doing the
-- period split / zero-filling, so the date handling stays in the viewer's
-- local calendar exactly like before.

-- Per-day lesson plan / completion / attendance counts for the dashboard's
-- attendance-rate and completion-rate charts. Mirrors the previous client
-- query: soft-deleted lesson plans are ignored, "scheduled" counts lesson
-- plans (with or without a meeting yet), "completed" counts meetings whose
-- status is COMPLETED, attendance counts every attendance row and treats
-- PRESENT and LATE as present.
CREATE OR REPLACE FUNCTION public.dashboard_analytics_by_day(
  p_from DATE,
  p_to DATE
)
RETURNS TABLE (
  day DATE,
  scheduled_count INT,
  completed_count INT,
  attendance_total INT,
  attendance_present INT
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
    RAISE EXCEPTION 'dashboard_analytics_by_day: admin or coordinator only'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    lp."scheduledDate",
    count(*)::INT,
    (count(*) FILTER (WHERE m.status = 'COMPLETED'))::INT,
    COALESCE(sum(att.total), 0)::INT,
    COALESCE(sum(att.present), 0)::INT
  FROM public.lesson_plans lp
  LEFT JOIN public.meetings m ON m."lessonPlanId" = lp.id
  LEFT JOIN LATERAL (
    SELECT
      count(*) AS total,
      count(*) FILTER (WHERE a.status IN ('PRESENT', 'LATE')) AS present
    FROM public.attendances a
    WHERE a."meetingId" = m.id
  ) att ON TRUE
  WHERE lp."scheduledDate" BETWEEN p_from AND p_to
    AND lp."deletedAt" IS NULL
  GROUP BY lp."scheduledDate"
  ORDER BY lp."scheduledDate";
END;
$$;

-- Per-day meeting/report counts for the dashboard's "Daily Teaching Report"
-- card, keyed by the lesson plan's scheduledDate (not the report's filing
-- date). A meeting counts as "finished" once it has a check-out, a report,
-- or COMPLETED status; "pending" is a finished meeting with no report yet.
-- Mirrors the previous client query exactly, including that it does not
-- filter lesson_plans.deletedAt and has no upper date bound.
CREATE OR REPLACE FUNCTION public.dashboard_report_stats_by_day(
  p_since DATE
)
RETURNS TABLE (
  day DATE,
  finished_count INT,
  pending_count INT,
  report_count INT,
  objectives_yes INT,
  objectives_partial INT,
  objectives_no INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT COALESCE(public.is_admin() OR public.is_coordinator(), FALSE) THEN
    RAISE EXCEPTION 'dashboard_report_stats_by_day: admin or coordinator only'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    lp."scheduledDate",
    (count(*) FILTER (
      WHERE co.id IS NOT NULL OR tr.id IS NOT NULL OR m.status = 'COMPLETED'
    ))::INT,
    (count(*) FILTER (
      WHERE (co.id IS NOT NULL OR m.status = 'COMPLETED') AND tr.id IS NULL
    ))::INT,
    (count(*) FILTER (WHERE tr.id IS NOT NULL))::INT,
    (count(*) FILTER (WHERE tr."objectivesAchieved" = 'YES'))::INT,
    (count(*) FILTER (WHERE tr."objectivesAchieved" = 'PARTIALLY'))::INT,
    (count(*) FILTER (WHERE tr."objectivesAchieved" = 'NO'))::INT
  FROM public.meetings m
  JOIN public.lesson_plans lp ON lp.id = m."lessonPlanId"
  LEFT JOIN public.check_outs co ON co."meetingId" = m.id
  LEFT JOIN public.teaching_reports tr ON tr."meetingId" = m.id
  WHERE lp."scheduledDate" >= p_since
  GROUP BY lp."scheduledDate"
  ORDER BY lp."scheduledDate";
END;
$$;

-- SECURITY DEFINER bypasses RLS, so the admin/coordinator check above is the
-- only gate — keep EXECUTE away from PUBLIC and anon as well. Admins and
-- coordinators already have read access to every table involved, so this
-- exposes nothing they could not select before.
REVOKE ALL ON FUNCTION public.dashboard_analytics_by_day(DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_analytics_by_day(DATE, DATE) TO authenticated;

REVOKE ALL ON FUNCTION public.dashboard_report_stats_by_day(DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_report_stats_by_day(DATE) TO authenticated;
