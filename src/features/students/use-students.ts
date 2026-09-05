import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createStudent,
  fetchStudents,
  searchStudents,
  setStudentActive,
  updateStudent,
} from "./queries";
import type { StudentInput } from "./schema";

const STUDENTS_KEY = ["students"];

export function useStudents(schoolId?: string, options?: { excludeTeacherTraining?: boolean }) {
  return useQuery({
    queryKey: [...STUDENTS_KEY, schoolId || "all", options?.excludeTeacherTraining ? "regular-only" : "all-types"],
    queryFn: () => fetchStudents(schoolId, options),
  });
}

/** Search-as-you-type student lookup for pickers — pass the caller's own
 * debounced query so keystrokes don't each fire a request. */
export function useStudentSearch(query: string, schoolId?: string) {
  const q = query.trim();
  return useQuery({
    queryKey: [...STUDENTS_KEY, "search", q, schoolId || "all"],
    queryFn: () => searchStudents({ query: q, schoolId }),
    enabled: q.length > 0,
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StudentInput) => createStudent(input),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
      if (input.classId) {
        queryClient.invalidateQueries({ queryKey: ["class-roster", input.classId] });
      }
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
