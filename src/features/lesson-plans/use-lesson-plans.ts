import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  return useMutation({
    mutationFn: (input: LessonPlanInput) => {
      const teacherId = createdByTeacherId ?? teacher?.teacherId;
      if (!teacherId) throw new Error("Profil teacher belum siap");
      return createLessonPlan(input, teacherId);
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

/** Admin-only. */
export function useDeleteLessonPlan() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (id: string) => deleteLessonPlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LESSON_PLANS_KEY });
      queryClient.invalidateQueries({ queryKey: TODAY_CLASSES_KEY });
      toast.success("Lesson plan berhasil dihapus");
      router.push("/lesson-plans");
    },
    onError: (error) =>
      toast.error("Gagal menghapus lesson plan", { description: error.message }),
  });
}
