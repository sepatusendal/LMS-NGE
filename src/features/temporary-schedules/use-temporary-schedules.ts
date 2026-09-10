import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createTemporarySchedules,
  deleteTemporaryScheduleBatch,
  fetchTemporaryScheduleBatches,
} from "./queries";
import type { TemporaryScheduleInput } from "./schema";

const TEMPORARY_SCHEDULES_KEY = ["temporary-schedules"];

export function useTemporarySchedules() {
  return useQuery({ queryKey: TEMPORARY_SCHEDULES_KEY, queryFn: fetchTemporaryScheduleBatches });
}

export function useCreateTemporarySchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TemporaryScheduleInput) => createTemporarySchedules(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPORARY_SCHEDULES_KEY });
      toast.success("Jadwal sementara berhasil dibuat");
    },
    onError: (error) =>
      toast.error("Gagal membuat jadwal sementara", { description: error.message }),
  });
}

export function useDeleteTemporaryScheduleBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) => deleteTemporaryScheduleBatch(batchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPORARY_SCHEDULES_KEY });
      toast.success("Jadwal sementara dibatalkan");
    },
    onError: (error) =>
      toast.error("Gagal membatalkan jadwal sementara", { description: error.message }),
  });
}
