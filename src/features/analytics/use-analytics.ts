import { useQuery } from "@tanstack/react-query";
import {
  fetchClassesReport,
  fetchDailyTeachingReportDetail,
  fetchLessonPlanReport,
  fetchStudentAttendanceReport,
  fetchTutorAttendanceReport,
} from "./admin-queries";
import type { AnalyticsFilters } from "./schema";

function filtersKey(filters: AnalyticsFilters) {
  return [filters.dateFrom, filters.dateTo, filters.schoolId ?? "", filters.classId ?? "", filters.teacherId ?? "", filters.studentId ?? ""];
}

export function useTutorAttendanceReport(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ["analytics", "tutor-attendance", ...filtersKey(filters)],
    queryFn: () => fetchTutorAttendanceReport(filters),
  });
}

export function useStudentAttendanceReport(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ["analytics", "student-attendance", ...filtersKey(filters)],
    queryFn: () => fetchStudentAttendanceReport(filters),
  });
}

export function useDailyTeachingReportDetail(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ["analytics", "daily-teaching-report", ...filtersKey(filters)],
    queryFn: () => fetchDailyTeachingReportDetail(filters),
  });
}

export function useLessonPlanReport(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ["analytics", "lesson-plan", ...filtersKey(filters)],
    queryFn: () => fetchLessonPlanReport(filters),
  });
}

export function useClassesReport(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ["analytics", "classes", ...filtersKey(filters)],
    queryFn: () => fetchClassesReport(filters),
  });
}
