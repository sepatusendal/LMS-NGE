import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { fetchReport, createReport, fetchReportPageContext, updateReport } from "./queries";
import { useCurrentTeacher } from "@/features/teachers/use-current-teacher";
import { classifyError, errorMessage } from "@/lib/error-kind";
import type { ReportObjectiveInput } from "./schema";

const REPORT_KEY = ["teaching-report"];

export function useReport(meetingId: string) {
  return useQuery({
    queryKey: [...REPORT_KEY, meetingId],
    queryFn: () => fetchReport(meetingId),
    enabled: Boolean(meetingId),
  });
}

export function useReportPageContext(meetingId: string) {
  return useQuery({
    queryKey: ["report-page-context", meetingId],
    queryFn: () => fetchReportPageContext(meetingId),
    enabled: Boolean(meetingId),
  });
}

/** @param adminOverride Present when an admin is filing this report on the
 * tutor's behalf (BackfillSessionDialog / MeetingAdminDialog) — supplies the
 * teacherId to attribute the report to instead of the logged-in user's own
 * teacher profile (admin usually has none) and an optional audit note. */
export function useCreateReport(
  meetingId: string,
  adminOverride?: { originalTeacherId: string; adminNote?: string },
) {
  const queryClient = useQueryClient();
  const { data: teacher } = useCurrentTeacher(!adminOverride);
  const t = useTranslations("reportForm.toasts");
  const tErr = useTranslations("errors");

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
      const originalTeacherId = adminOverride?.originalTeacherId ?? teacher?.teacherId;
      if (!originalTeacherId) throw new Error(t("profileNotReady"));
      return createReport({
        meetingId,
        originalTeacherId,
        adminNote: adminOverride?.adminNote,
        ...input,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...REPORT_KEY, meetingId] });
      queryClient.invalidateQueries({ queryKey: ["today-classes"] });
      toast.success(t("saveSuccess"));
    },
    onError: (error) => {
      const kind = classifyError(error);
      toast.error(t("saveError"), {
        description: kind === "other" ? errorMessage(error) : tErr(kind),
      });
    },
  });
}

const KNOWN_UPDATE_ERRORS = new Set(["REPORT_EDIT_NOT_ALLOWED"]);

export function useUpdateReport(meetingId: string, adminOverride?: { adminNote?: string }) {
  const queryClient = useQueryClient();
  const t = useTranslations("reportForm.toasts");
  const tErr = useTranslations("errors");

  return useMutation({
    mutationFn: (input: { reportId: string } & Parameters<typeof updateReport>[1]) =>
      updateReport(input.reportId, { ...input, adminNote: input.adminNote ?? adminOverride?.adminNote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...REPORT_KEY, meetingId] });
      queryClient.invalidateQueries({ queryKey: ["today-classes"] });
      toast.success(t("updateSuccess"));
    },
    onError: (error) => {
      const kind = classifyError(error);
      toast.error(t("updateError"), {
        description: KNOWN_UPDATE_ERRORS.has(error.message)
          ? t(error.message)
          : kind === "other"
            ? errorMessage(error)
            : tErr(kind),
      });
    },
  });
}
