import { useQuery } from "@tanstack/react-query";
import {
  fetchOpenFollowUps,
  fetchReportNotes,
  fetchReportStats,
  fetchTeacherAttendance,
  fetchTutorPayroll,
} from "./queries";

export function useTeacherAttendance(days: number) {
  return useQuery({
    queryKey: ["dashboard-teacher-attendance", days],
    queryFn: () => fetchTeacherAttendance(days),
  });
}

export function useReportStats(days: number) {
  return useQuery({
    queryKey: ["dashboard-report-stats", days],
    queryFn: () => fetchReportStats(days),
  });
}

export function useOpenFollowUps() {
  return useQuery({
    queryKey: ["dashboard-open-followups"],
    queryFn: () => fetchOpenFollowUps(8),
  });
}

export function useReportNotes() {
  return useQuery({
    queryKey: ["dashboard-report-notes"],
    queryFn: () => fetchReportNotes(8),
  });
}

export function useTutorPayroll(from?: string | null, to?: string | null) {
  return useQuery({
    queryKey: ["dashboard-tutor-payroll", from, to],
    queryFn: () => fetchTutorPayroll(from, to),
  });
}
