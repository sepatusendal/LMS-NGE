import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createLessonPlan,
  fetchLessonPlan,
  fetchLessonPlans,
  updateLessonPlan,
} from "./queries";
import type { LessonPlanInput } from "./schema";
import { useCurrentTeacher } from "@/features/teachers/use-current-teacher";

const LESSON_PLANS_KEY = ["lesson-plans"];
const TODAY_CLASSES_KEY = ["today-classes"];

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

export function useCreateLessonPlan() {
  const queryClient = useQueryClient();
  const { data: teacher } = useCurrentTeacher();
  return useMutation({
    mutationFn: (input: LessonPlanInput) => {
      if (!teacher?.teacherId) throw new Error("Profil teacher belum siap");
      return createLessonPlan(input, teacher.teacherId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LESSON_PLANS_KEY });
      queryClient.invalidateQueries({ queryKey: TODAY_CLASSES_KEY });
      toast.success("Lesson plan berhasil disimpan");
    },
    onError: (error) =>
      toast.error("Gagal menyimpan lesson plan", { description: error.message }),
  });
}

export function useUpdateLessonPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: LessonPlanInput }) =>
      updateLessonPlan(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LESSON_PLANS_KEY });
      queryClient.invalidateQueries({ queryKey: TODAY_CLASSES_KEY });
      toast.success("Lesson plan berhasil diperbarui");
    },
    onError: (error) =>
      toast.error("Gagal memperbarui lesson plan", { description: error.message }),
  });
}
