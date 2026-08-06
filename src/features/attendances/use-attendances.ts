import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchAttendances,
  upsertAttendance,
  bulkUpsertAttendance,
} from "./queries";
import type { AttendanceInput, BulkAttendanceInput } from "./schema";

const ATTENDANCE_KEY = ["attendances"];

export function useAttendances(meetingId: string) {
  return useQuery({
    queryKey: [...ATTENDANCE_KEY, meetingId],
    queryFn: () => fetchAttendances(meetingId),
    enabled: Boolean(meetingId),
  });
}

export function useUpsertAttendance(meetingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AttendanceInput) => upsertAttendance(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ATTENDANCE_KEY, meetingId] });
    },
    onError: (error) =>
      toast.error("Gagal menyimpan absensi", { description: error.message }),
  });
}

export function useBulkAttendance(meetingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkAttendanceInput) => bulkUpsertAttendance(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ATTENDANCE_KEY, meetingId] });
      queryClient.invalidateQueries({ queryKey: ["today-classes"] });
      toast.success("Absensi berhasil disimpan");
    },
    onError: (error) =>
      toast.error("Gagal menyimpan absensi", { description: error.message }),
  });
}
