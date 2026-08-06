import { useQuery } from "@tanstack/react-query";
import { fetchClassTimeline } from "./timeline-queries";

export function useClassTimeline(classId: string) {
  return useQuery({
    queryKey: ["class-timeline", classId],
    queryFn: () => fetchClassTimeline(classId),
    enabled: Boolean(classId),
  });
}
