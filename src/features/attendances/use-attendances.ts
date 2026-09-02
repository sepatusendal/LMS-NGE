import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  fetchAttendances,
  upsertAttendance,
  bulkUpsertAttendance,
} from "./queries";
import { fetchClassAttendanceSummary } from "./admin-queries";
import type { AttendanceInput, BulkAttendanceInput } from "./schema";

const ATTENDANCE_KEY = ["attendances"];

export function useAttendances(meetingId: string) {
  return useQuery({
    queryKey: [...ATTENDANCE_KEY, meetingId],
    queryFn: () => fetchAttendances(meetingId),
    enabled: Boolean(meetingId),
  });
}

export function useClassAttendanceSummary(classId: string) {
  return useQuery({
    queryKey: ["class-attendance-summary", classId],
    queryFn: () => fetchClassAttendanceSummary(classId),
    enabled: Boolean(classId),
  });
}

export function useUpsertAttendance(meetingId: string) {
  const queryClient = useQueryClient();
  const t = useTranslations("attendanceForm.toasts");
  return useMutation({
    mutationFn: (input: AttendanceInput) => upsertAttendance(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ATTENDANCE_KEY, meetingId] });
    },
    onError: (error) =>
      toast.error(t("saveError"), { description: error.message }),
  });
}

export function useBulkAttendance(meetingId: string) {
  const queryClient = useQueryClient();
  const t = useTranslations("attendanceForm.toasts");
  return useMutation({
    mutationFn: (input: BulkAttendanceInput) => bulkUpsertAttendance(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ATTENDANCE_KEY, meetingId] });
      queryClient.invalidateQueries({ queryKey: ["today-classes"] });
      toast.success(t("saveSuccess"));
    },
    onError: (error) =>
      toast.error(t("saveError"), { description: error.message }),
  });
}
