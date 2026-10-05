import { useQuery } from "@tanstack/react-query";
import { fetchAdminReportDetail, fetchAdminReports, fetchReportSummaryByClass } from "./admin-queries";

export function useAdminReports() {
  return useQuery({ queryKey: ["admin-reports"], queryFn: () => fetchAdminReports() });
}

/** Keyed under "admin-reports" so every place that already invalidates the
 * report list after a report-affecting change (backfill, admin check-in
 * edits, tutor reassignment) refreshes this summary too. */
export function useReportSummaryByClass() {
  return useQuery({ queryKey: ["admin-reports", "summary-by-class"], queryFn: fetchReportSummaryByClass });
}

export function useAdminReportDetail(id: string) {
  return useQuery({
    queryKey: ["admin-report-detail", id],
    queryFn: () => fetchAdminReportDetail(id),
    enabled: Boolean(id),
  });
}
