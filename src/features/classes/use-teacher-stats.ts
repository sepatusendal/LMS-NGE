import { useQuery } from "@tanstack/react-query";
import { useMyClasses } from "./use-my-classes";
import { fetchTeacherStudentCount } from "./roster-queries";

export function useTeacherStats() {
  const { data: allClasses, isLoading: classesLoading } = useMyClasses();
  // A class reached only as a one-off substitute for a meeting is not one of
  // this teacher's classes — keep it out of the class and student headcounts.
  const classes = allClasses?.filter((c) => c.canAuthorLessonPlans);
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
