import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  assignTeacherToClassDay,
  fetchTeacherAssignments,
  unassignTeacherFromDay,
} from "./assignment-queries";

function assignmentsKey(teacherId: string) {
  return ["teacher-assignments", teacherId];
}

export function useTeacherAssignments(teacherId: string) {
  return useQuery({
    queryKey: assignmentsKey(teacherId),
    queryFn: () => fetchTeacherAssignments(teacherId),
    enabled: Boolean(teacherId),
  });
}

/** Invalidates the same keys `useUpsertScheduleOverride`/`useDeleteScheduleOverride`
 * do (schedule-overrides, classes) plus this teacher's own assignment list, so
 * the Class detail page's panel and this one never go stale relative to each
 * other regardless of which side made the change. */
function invalidateAssignmentSurfaces(queryClient: ReturnType<typeof useQueryClient>, teacherId: string) {
  queryClient.invalidateQueries({ queryKey: assignmentsKey(teacherId) });
  queryClient.invalidateQueries({ queryKey: ["schedule-overrides"] });
  queryClient.invalidateQueries({ queryKey: ["classes"] });
}

export function useAssignTeacherToClassDay(teacherId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignTeacherToClassDay,
    onSuccess: () => {
      invalidateAssignmentSurfaces(queryClient, teacherId);
      toast.success("Guru berhasil di-assign ke kelas");
    },
    onError: (error) => toast.error("Gagal assign guru ke kelas", { description: error.message }),
  });
}

export function useUnassignTeacherFromDay(teacherId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unassignTeacherFromDay,
    onSuccess: () => {
      invalidateAssignmentSurfaces(queryClient, teacherId);
      toast.success("Assignment dihapus, kembali ke guru default kelas");
    },
    onError: (error) => toast.error("Gagal menghapus assignment", { description: error.message }),
  });
}
