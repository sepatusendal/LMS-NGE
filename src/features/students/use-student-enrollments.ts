import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  enrollStudent,
  fetchSchoolEnrollments,
  moveStudent,
  unenrollStudent,
} from "@/features/classes/roster-queries";

const ENROLLMENTS_KEY = ["student-enrollments"];

export function useSchoolEnrollments(schoolId?: string) {
  return useQuery({
    queryKey: [...ENROLLMENTS_KEY, schoolId],
    queryFn: () => fetchSchoolEnrollments(schoolId as string),
    enabled: Boolean(schoolId),
  });
}

function useInvalidateEnrollments() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ENROLLMENTS_KEY });
    queryClient.invalidateQueries({ queryKey: ["class-roster"] });
  };
}

export function useAssignStudentToClass() {
  const invalidate = useInvalidateEnrollments();
  return useMutation({
    mutationFn: ({ studentId, classId }: { studentId: string; classId: string }) =>
      enrollStudent(classId, studentId),
    onSuccess: () => {
      invalidate();
      toast.success("Siswa berhasil ditambahkan ke kelas");
    },
    onError: (error) =>
      toast.error("Gagal menambahkan siswa ke kelas", { description: error.message }),
  });
}

export function useRemoveStudentFromClass() {
  const invalidate = useInvalidateEnrollments();
  return useMutation({
    mutationFn: (enrollmentId: string) => unenrollStudent(enrollmentId),
    onSuccess: () => {
      invalidate();
      toast.success("Siswa dikeluarkan dari kelas");
    },
    onError: (error) =>
      toast.error("Gagal mengeluarkan siswa", { description: error.message }),
  });
}

export function useMoveStudentToClass() {
  const invalidate = useInvalidateEnrollments();
  return useMutation({
    mutationFn: (args: { studentId: string; fromEnrollmentId: string; toClassId: string }) =>
      moveStudent(args.studentId, args.fromEnrollmentId, args.toClassId),
    onSuccess: () => {
      invalidate();
      toast.success("Siswa berhasil dipindahkan");
    },
    onError: (error) =>
      toast.error("Gagal memindahkan siswa", { description: error.message }),
  });
}
