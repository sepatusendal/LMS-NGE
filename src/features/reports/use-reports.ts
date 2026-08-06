import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchReport, createReport } from "./queries";
import { useCurrentTeacher } from "@/features/teachers/use-current-teacher";
import type { ObjectivesAchieved } from "./schema";

const REPORT_KEY = ["teaching-report"];

export function useReport(meetingId: string) {
  return useQuery({
    queryKey: [...REPORT_KEY, meetingId],
    queryFn: () => fetchReport(meetingId),
    enabled: Boolean(meetingId),
  });
}

export function useCreateReport(meetingId: string) {
  const queryClient = useQueryClient();
  const { data: teacher } = useCurrentTeacher();

  return useMutation({
    mutationFn: (input: {
      skills: string[];
      objectivesAchieved?: ObjectivesAchieved;
      whatWentWell?: string;
      whatNeedsImprovement?: string;
      nextLessonNotes?: string;
      homeworkAssigned?: string;
      photoDriveFileId?: string;
      photoFileName?: string;
      followUps: { studentId: string; note: string }[];
    }) => {
      if (!teacher?.teacherId) throw new Error("Profil belum siap");
      return createReport({
        meetingId,
        originalTeacherId: teacher.teacherId,
        ...input,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...REPORT_KEY, meetingId] });
      queryClient.invalidateQueries({ queryKey: ["today-classes"] });
      toast.success("Daily Teaching Report berhasil disimpan");
    },
    onError: (error) =>
      toast.error("Gagal menyimpan report", { description: error.message }),
  });
}
