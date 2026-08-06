import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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

export function useStartClass() {
  const queryClient = useQueryClient();
  const { data: teacher } = useCurrentTeacher();

  return useMutation({
    mutationFn: async (lessonPlanId: string) => {
      if (!teacher?.teacherId) throw new Error("Profil belum siap");
      return startClass(lessonPlanId, teacher.teacherId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODAY_KEY });
      toast.success("Kelas dimulai! Check-in berhasil");
    },
    onError: (error) =>
      toast.error("Gagal memulai kelas", { description: error.message }),
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();
  const { data: teacher } = useCurrentTeacher();

  return useMutation({
    mutationFn: async (meetingId: string) => {
      if (!teacher?.teacherId) throw new Error("Profil belum siap");
      await doCheckOut({ meetingId, teacherId: teacher.teacherId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODAY_KEY });
      toast.success("Check-out berhasil");
    },
    onError: (error) =>
      toast.error("Gagal check-out", { description: error.message }),
  });
}
