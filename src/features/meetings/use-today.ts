import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useCurrentTeacher } from "@/features/teachers/use-current-teacher";
import { fetchTodayClasses, startClass, checkInWithDraftPlan } from "./queries";
import type { TodayClass } from "./schema";

const TODAY_KEY = ["today-classes"];

export function useTodayClasses(): {
  data: TodayClass[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
} {
  const { data: teacher, isLoading: teacherLoading, isError: teacherIsError, error: teacherError } = useCurrentTeacher();
  const query = useQuery({
    queryKey: TODAY_KEY,
    queryFn: () => fetchTodayClasses(teacher!.teacherId),
    enabled: Boolean(teacher?.teacherId),
  });

  return {
    data: query.data,
    isLoading: teacherLoading || query.isLoading,
    isError: teacherIsError || query.isError,
    error: teacherError || query.error,
  };
}

const START_CLASS_ERROR_MESSAGES = new Set(["HOLIDAY_NO_CLASS", "ALREADY_CHECKED_IN"]);

export function useStartClass() {
  const queryClient = useQueryClient();
  const { data: teacher } = useCurrentTeacher();
  const t = useTranslations("workflow.toasts");

  return useMutation({
    mutationFn: async (lessonPlanId: string) => {
      if (!teacher?.teacherId) throw new Error(t("profileNotReady"));
      return startClass(lessonPlanId, teacher.teacherId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODAY_KEY });
      toast.success(t("classStarted"));
    },
    onError: (error) =>
      toast.error(t("startClassError"), {
        description: START_CLASS_ERROR_MESSAGES.has(error.message) ? t(error.message) : error.message,
      }),
  });
}

const DRAFT_CHECK_IN_ERROR_MESSAGES = new Set(["HOLIDAY_NO_CLASS", "NOT_PRIMARY_TEACHER"]);

/** Check-in for a class whose next meeting has no lesson plan yet
 * ("no_plan_today") — creates a placeholder plan, the meeting, and the
 * check-in row in one atomic call. See checkInWithDraftPlan() in queries.ts
 * and check_in_with_draft_plan() in the DB. */
export function useCheckInWithDraftPlan() {
  const queryClient = useQueryClient();
  const { data: teacher } = useCurrentTeacher();
  const t = useTranslations("workflow.toasts");

  return useMutation({
    mutationFn: async (input: { classId: string; meetingNumber: number; week: number; scheduledDate: string }) => {
      if (!teacher?.teacherId) throw new Error(t("profileNotReady"));
      return checkInWithDraftPlan(input.classId, teacher.teacherId, input.meetingNumber, input.week, input.scheduledDate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODAY_KEY });
      queryClient.invalidateQueries({ queryKey: ["lesson-plans"] });
      toast.success(t("classStarted"));
    },
    onError: (error) =>
      toast.error(t("startClassError"), {
        description: DRAFT_CHECK_IN_ERROR_MESSAGES.has(error.message) ? t(error.message) : error.message,
      }),
  });
}
