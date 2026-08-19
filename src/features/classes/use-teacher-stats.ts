import { useQuery } from "@tanstack/react-query";
import { useMyClasses } from "./use-my-classes";
import { fetchTeacherStudentCount } from "./roster-queries";

export function useTeacherStats() {
  const { data: classes, isLoading: classesLoading } = useMyClasses();
  const classIds = classes?.map((c) => c.id) ?? [];

  const studentQuery = useQuery({
    queryKey: ["teacher-student-count", ...classIds],
    queryFn: () => fetchTeacherStudentCount(classIds),
    enabled: Boolean(classes),
  });

  return {
    classCount: classes?.length ?? 0,
    studentCount: studentQuery.data ?? 0,
    isLoading: classesLoading || studentQuery.isLoading,
  };
}
