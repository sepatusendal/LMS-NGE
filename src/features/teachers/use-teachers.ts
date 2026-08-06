import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchTeachers, setTeacherActive, updateTeacher } from "./queries";
import { createTeacherAccount } from "./actions";
import type { TeacherCreateInput, TeacherEditInput } from "./schema";

const TEACHERS_KEY = ["teachers"];

export function useTeachers() {
  return useQuery({ queryKey: TEACHERS_KEY, queryFn: fetchTeachers });
}

export function useCreateTeacher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TeacherCreateInput) => createTeacherAccount(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEACHERS_KEY });
    },
    onError: (error) =>
      toast.error("Gagal membuat akun teacher", { description: error.message }),
  });
}

export function useUpdateTeacher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TeacherEditInput }) =>
      updateTeacher(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEACHERS_KEY });
      toast.success("Data teacher berhasil diperbarui");
    },
    onError: (error) =>
      toast.error("Gagal memperbarui data teacher", { description: error.message }),
  });
}

export function useSetTeacherActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setTeacherActive(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TEACHERS_KEY }),
    onError: (error) =>
      toast.error("Gagal mengubah status teacher", { description: error.message }),
  });
}
