import { useQuery } from "@tanstack/react-query";
import { useMyClasses } from "./use-my-classes";
import { fetchTeacherStudentCount } from "./roster-queries";

export function useTeacherStats() {
  // "Kelas diampu" / "Total siswa" on /today mean every class this teacher is
  // actually teaching — including a one-off substitute meeting — not just the
  // ones they own/author plans for (unlike useComplianceCount, which only
  // cares about classes whose lesson-plan upkeep is their job).
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
