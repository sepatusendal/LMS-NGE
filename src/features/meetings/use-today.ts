import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useCurrentTeacher } from "@/features/teachers/use-current-teacher";
import { fetchTodayClasses, startClass, doCheckOut } from "./queries";
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

export function useCheckOut() {
  const queryClient = useQueryClient();
  const { data: teacher } = useCurrentTeacher();
  const t = useTranslations("workflow.toasts");

  return useMutation({
    mutationFn: async (meetingId: string) => {
      if (!teacher?.teacherId) throw new Error(t("profileNotReady"));
      await doCheckOut({ meetingId, teacherId: teacher.teacherId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODAY_KEY });
      toast.success(t("checkOutSuccess"));
    },
    onError: (error) =>
      toast.error(t("checkOutError"), { description: error.message }),
  });
}
