import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { enrollStudent, fetchClassRoster, unenrollStudent } from "./roster-queries";

export function useClassRoster(classId: string) {
  return useQuery({
    queryKey: ["class-roster", classId],
    queryFn: () => fetchClassRoster(classId),
    enabled: Boolean(classId),
  });
}

export function useEnrollStudent(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (studentId: string) => enrollStudent(classId, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-roster", classId] });
      toast.success("Siswa berhasil ditambahkan ke kelas");
    },
    onError: (error) =>
      toast.error("Gagal menambahkan siswa ke kelas", {
        description: error.message,
      }),
  });
}

export function useUnenrollStudent(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enrollmentId: string) => unenrollStudent(enrollmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-roster", classId] });
      toast.success("Siswa dikeluarkan dari kelas");
    },
    onError: (error) =>
      toast.error("Gagal mengeluarkan siswa", { description: error.message }),
  });
}
