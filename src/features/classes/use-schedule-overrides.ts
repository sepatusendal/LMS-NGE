import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  deleteScheduleOverride,
  fetchScheduleOverrides,
  upsertScheduleOverride,
} from "./schedule-override-queries";

function overridesKey(classId: string) {
  return ["schedule-overrides", classId];
}

export function useScheduleOverrides(classId: string) {
  return useQuery({
    queryKey: overridesKey(classId),
    queryFn: () => fetchScheduleOverrides(classId),
    enabled: Boolean(classId),
  });
}

export function useUpsertScheduleOverride(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: upsertScheduleOverride,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: overridesKey(classId) });
      toast.success("Jadwal hari tersebut berhasil disimpan");
    },
    onError: (error) =>
      toast.error("Gagal menyimpan jadwal", { description: error.message }),
  });
}

export function useDeleteScheduleOverride(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteScheduleOverride,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: overridesKey(classId) });
      toast.success("Override dihapus, kembali ke jadwal default");
    },
    onError: (error) =>
      toast.error("Gagal menghapus override", { description: error.message }),
  });
}
