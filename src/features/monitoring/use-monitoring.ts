import { useQuery } from "@tanstack/react-query";
import { fetchAnalytics, fetchStatusBoard } from "./queries";

export function useStatusBoard(date: string) {
  return useQuery({
    queryKey: ["monitoring-status-board", date],
    queryFn: () => fetchStatusBoard(date),
    enabled: Boolean(date),
    // Substitute assignments and Jadwal Sementara edits happen from other
    // parts of the app (and other admins/coordinators) that can't push into
    // this cache directly — poll and refetch on focus so the board reflects
    // them without a manual reload.
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useMonitoringAnalytics(days: number) {
  return useQuery({
    queryKey: ["monitoring-analytics", days],
    queryFn: () => fetchAnalytics(days),
  });
}
