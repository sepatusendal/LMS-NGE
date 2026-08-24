import { useCurrentUser } from "@/features/auth/use-current-user";
import { useClasses } from "@/features/classes/use-classes";
import { useMyClasses } from "@/features/classes/use-my-classes";
import { useLessonPlans } from "./use-lesson-plans";
import { getClassComplianceStatus } from "./compliance";

/** Role-aware count of classes whose lesson plan isn't ready 2+ weeks out —
 * admin/coordinator see it across every class, a teacher sees it scoped to
 * their own (primary-taught) classes via RLS-backed queries. Drives the nav
 * badges and the /today banner; recomputed live, no stored/cached alert
 * state to keep in sync. */
export function useComplianceCount() {
  const { data: currentUser } = useCurrentUser();
  const isTeacher = currentUser?.role === "TEACHER";

  const { data: adminClasses, isLoading: adminLoading } = useClasses(undefined, !isTeacher);
  const { data: myClasses, isLoading: myClassesLoading } = useMyClasses();
  const { data: lessonPlans, isLoading: plansLoading } = useLessonPlans();

  const classIds = isTeacher
    ? (myClasses ?? []).filter((c) => c.isPrimary).map((c) => c.id)
    : (adminClasses ?? []).map((c) => c.id);

  const isLoading = isTeacher ? myClassesLoading || plansLoading : adminLoading || plansLoading;

  if (isLoading || !lessonPlans) {
    return { count: 0, isLoading: true };
  }

  const now = Date.now();
  const count = classIds.filter((id) => !getClassComplianceStatus(id, lessonPlans, now).isCompliant).length;

  return { count, isLoading: false };
}
