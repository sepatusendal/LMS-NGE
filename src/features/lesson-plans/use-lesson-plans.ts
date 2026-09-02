import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  createLessonPlan,
  deleteLessonPlan,
  fetchLessonPlan,
  fetchLessonPlans,
  updateLessonPlan,
} from "./queries";
import type { LessonPlanInput } from "./schema";
import { useCurrentTeacher } from "@/features/teachers/use-current-teacher";

const LESSON_PLANS_KEY = ["lesson-plans"];
const TODAY_CLASSES_KEY = ["today-classes"];
const KNOWN_ERROR_CODES = new Set(["HOLIDAY_NO_LESSON_PLAN", "DUPLICATE_MEETING_NUMBER"]);

export function useLessonPlans() {
  return useQuery({ queryKey: LESSON_PLANS_KEY, queryFn: fetchLessonPlans });
}

export function useLessonPlan(id: string) {
  return useQuery({
    queryKey: [...LESSON_PLANS_KEY, id],
    queryFn: () => fetchLessonPlan(id),
    enabled: Boolean(id),
  });
}

/** Pass createdByTeacherId to author on behalf of a specific teacher (admin
 * use — admin has no Teacher record of their own to fall back to). Omit it
 * for the normal teacher-authoring-their-own-plan path. */
export function useCreateLessonPlan(createdByTeacherId?: string) {
  const queryClient = useQueryClient();
  const { data: teacher } = useCurrentTeacher();
  const t = useTranslations("lessonPlanForm.toasts");
  return useMutation({
    mutationFn: (input: LessonPlanInput) => {
      const teacherId = createdByTeacherId ?? teacher?.teacherId;
      if (!teacherId) throw new Error(t("teacherProfileNotReady"));
      return createLessonPlan(input, teacherId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LESSON_PLANS_KEY });
      queryClient.invalidateQueries({ queryKey: TODAY_CLASSES_KEY });
      toast.success(t("createSuccess"));
    },
    onError: (error) =>
      toast.error(t("createError"), {
        description: KNOWN_ERROR_CODES.has(error.message) ? t(error.message) : error.message,
      }),
  });
}

export function useUpdateLessonPlan() {
  const queryClient = useQueryClient();
  const t = useTranslations("lessonPlanForm.toasts");
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: LessonPlanInput }) =>
      updateLessonPlan(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LESSON_PLANS_KEY });
      queryClient.invalidateQueries({ queryKey: TODAY_CLASSES_KEY });
      toast.success(t("updateSuccess"));
    },
    onError: (error) =>
      toast.error(t("updateError"), {
        description: KNOWN_ERROR_CODES.has(error.message) ? t(error.message) : error.message,
      }),
  });
}

/** Admin-only. */
export function useDeleteLessonPlan() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const t = useTranslations("lessonPlanForm.toasts");
  return useMutation({
    mutationFn: (id: string) => deleteLessonPlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LESSON_PLANS_KEY });
      queryClient.invalidateQueries({ queryKey: TODAY_CLASSES_KEY });
      toast.success(t("deleteSuccess"));
      router.push("/lesson-plans");
    },
    onError: (error) =>
      toast.error(t("deleteError"), { description: error.message }),
  });
}
