import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchTeachers, updateTeacher } from "./queries";
import { createTeacherAccount, resetTeacherPassword, setTeacherActiveAction } from "./actions";
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
      toast.success("Akun teacher berhasil dibuat");
    },
    onError: (error) =>
      toast.error("Gagal membuat akun teacher", { description: error.message }),
  });
}

export function useUpdateTeacher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userId, input }: { id: string; userId: string; input: TeacherEditInput }) =>
      updateTeacher(id, userId, input),
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
    mutationFn: ({ id, userId, isActive }: { id: string; userId: string; isActive: boolean }) =>
      setTeacherActiveAction(id, userId, isActive),
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: TEACHERS_KEY });
      toast.success(isActive ? "Teacher diaktifkan kembali" : "Teacher dinonaktifkan — login diblokir");
    },
    onError: (error) =>
      toast.error("Gagal mengubah status teacher", { description: error.message }),
  });
}

export function useResetTeacherPassword() {
  return useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      resetTeacherPassword(userId, password),
    onSuccess: () => toast.success("Password teacher berhasil diganti"),
    onError: (error) =>
      toast.error("Gagal reset password", { description: error.message }),
  });
}
