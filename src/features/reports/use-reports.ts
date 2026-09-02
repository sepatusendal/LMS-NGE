import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { fetchReport, createReport } from "./queries";
import { useCurrentTeacher } from "@/features/teachers/use-current-teacher";
import type { ReportObjectiveInput } from "./schema";

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
  const t = useTranslations("reportForm.toasts");

  return useMutation({
    mutationFn: (input: {
      skills: string[];
      objectives: ReportObjectiveInput[];
      whatWentWell?: string;
      whatNeedsImprovement?: string;
      actionPlan?: string;
      nextLessonNotes?: string;
      homeworkAssigned?: string;
      languageSkillsFocus?: string;
      activitiesLog?: string;
      resourcesUsed?: string;
      photoDriveFileId?: string;
      photoFileName?: string;
      followUps: { studentId: string; note: string }[];
    }) => {
      if (!teacher?.teacherId) throw new Error(t("profileNotReady"));
      return createReport({
        meetingId,
        originalTeacherId: teacher.teacherId,
        ...input,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...REPORT_KEY, meetingId] });
      queryClient.invalidateQueries({ queryKey: ["today-classes"] });
      toast.success(t("saveSuccess"));
    },
    onError: (error) =>
      toast.error(t("saveError"), { description: error.message }),
  });
}
