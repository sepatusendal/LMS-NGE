import { useQuery } from "@tanstack/react-query";
import { fetchAnalytics, fetchStatusBoard } from "./queries";

export function useStatusBoard(date: string) {
  return useQuery({
    queryKey: ["monitoring-status-board", date],
    queryFn: () => fetchStatusBoard(date),
    enabled: Boolean(date),
  });
}

export function useMonitoringAnalytics(days: number) {
  return useQuery({
    queryKey: ["monitoring-analytics", days],
    queryFn: () => fetchAnalytics(days),
  });
}
