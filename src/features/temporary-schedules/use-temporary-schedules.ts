import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createTemporarySchedules,
  deleteTemporaryScheduleBatch,
  fetchTemporaryScheduleBatches,
  fetchTemporarySchedulesInRange,
  findTemporaryScheduleConflicts,
  updateTemporarySchedule,
} from "./queries";
import type { TemporaryScheduleInput } from "./schema";

const TEMPORARY_SCHEDULES_KEY = ["temporary-schedules"];

export function useTemporarySchedules() {
  return useQuery({ queryKey: TEMPORARY_SCHEDULES_KEY, queryFn: fetchTemporaryScheduleBatches });
}

/** Prefixed with TEMPORARY_SCHEDULES_KEY so every mutation's
 * invalidateQueries(TEMPORARY_SCHEDULES_KEY) below refreshes this too. */
export function useTemporarySchedulesInRange(dateFrom: string | null, dateTo: string | null) {
  return useQuery({
    queryKey: [...TEMPORARY_SCHEDULES_KEY, "range", dateFrom, dateTo],
    queryFn: () => fetchTemporarySchedulesInRange(dateFrom as string, dateTo as string),
    enabled: dateFrom !== null && dateTo !== null,
  });
}

/** A temp-schedule write changes who teaches a class and/or when — that
 * affects the admin/coordinator Status Board and the teacher-facing "today"
 * and "my classes" views too, not just this feature's own batch list. Every
 * mutation below must invalidate all four so those surfaces don't keep
 * showing pre-edit data until their own unrelated cache naturally expires. */
function invalidateScheduleDependents(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: TEMPORARY_SCHEDULES_KEY });
  queryClient.invalidateQueries({ queryKey: ["monitoring-status-board"] });
  queryClient.invalidateQueries({ queryKey: ["today-classes"] });
  queryClient.invalidateQueries({ queryKey: ["my-classes"] });
}

export function useCreateTemporarySchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TemporaryScheduleInput) => createTemporarySchedules(input),
    onSuccess: () => {
      invalidateScheduleDependents(queryClient);
      toast.success("Jadwal sementara berhasil dibuat");
    },
    onError: (error) =>
      toast.error("Gagal membuat jadwal sementara", { description: error.message }),
  });
}

export function useUpdateTemporarySchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, input }: { batchId: string; input: TemporaryScheduleInput }) =>
      updateTemporarySchedule(batchId, input),
    onSuccess: () => {
      invalidateScheduleDependents(queryClient);
      toast.success("Jadwal sementara berhasil diperbarui");
    },
    onError: (error) =>
      toast.error("Gagal memperbarui jadwal sementara", { description: error.message }),
  });
}

export function useDeleteTemporaryScheduleBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) => deleteTemporaryScheduleBatch(batchId),
    onSuccess: () => {
      invalidateScheduleDependents(queryClient);
      toast.success("Jadwal sementara dibatalkan");
    },
    onError: (error) =>
      toast.error("Gagal membatalkan jadwal sementara", { description: error.message }),
  });
}

/** Live conflict preview for the create/edit dialog — re-runs whenever the
 * relevant form fields change (debounced by the caller via `enabled`), so
 * clashing classes can be flagged before the admin hits Simpan instead of
 * only finding out on submit. `excludeBatchId` is passed while editing so
 * the batch being edited doesn't "conflict" with its own existing rows. */
export function useTemporaryScheduleConflictsPreview(
  input: TemporaryScheduleInput,
  enabled: boolean,
  excludeBatchId?: string,
) {
  return useQuery({
    queryKey: [
      "temporary-schedule-conflicts",
      input.classIds,
      input.teacherOverrides,
      input.dateFrom,
      input.dateTo,
      input.daysOfWeek,
      input.startTime,
      input.endTime,
      excludeBatchId,
    ],
    queryFn: () => findTemporaryScheduleConflicts(input, excludeBatchId),
    enabled,
  });
}
