import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createStudent,
  fetchStudents,
  setStudentActive,
  updateStudent,
} from "./queries";
import type { StudentInput } from "./schema";

const STUDENTS_KEY = ["students"];

export function useStudents(schoolId?: string) {
  return useQuery({
    queryKey: [...STUDENTS_KEY, schoolId || "all"],
    queryFn: () => fetchStudents(schoolId),
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StudentInput) => createStudent(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
      toast.success("Siswa berhasil ditambahkan");
    },
    onError: (error) =>
      toast.error("Gagal menambahkan siswa", { description: error.message }),
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: StudentInput }) =>
      updateStudent(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
      toast.success("Siswa berhasil diperbarui");
    },
    onError: (error) =>
      toast.error("Gagal memperbarui siswa", { description: error.message }),
  });
}

export function useSetStudentActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setStudentActive(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STUDENTS_KEY }),
    onError: (error) =>
      toast.error("Gagal mengubah status siswa", { description: error.message }),
  });
}
