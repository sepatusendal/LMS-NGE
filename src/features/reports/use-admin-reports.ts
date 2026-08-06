import { useQuery } from "@tanstack/react-query";
import { fetchAdminReportDetail, fetchAdminReports } from "./admin-queries";

export function useAdminReports() {
  return useQuery({ queryKey: ["admin-reports"], queryFn: fetchAdminReports });
}

export function useAdminReportDetail(id: string) {
  return useQuery({
    queryKey: ["admin-report-detail", id],
    queryFn: () => fetchAdminReportDetail(id),
    enabled: Boolean(id),
  });
}
