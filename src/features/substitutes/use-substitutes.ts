import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  assignSubstitute,
  assignSubstituteForLessonPlan,
  cancelSubstitute,
  fetchCurrentMeetingInfo,
  fetchHandoverSummary,
} from "./queries";

function meetingInfoKey(classId: string) {
  return ["current-meeting-info", classId];
}

function timelineKey(classId: string) {
  return ["class-timeline", classId];
}

export function useCurrentMeetingInfo(classId: string) {
  return useQuery({
    queryKey: meetingInfoKey(classId),
    queryFn: () => fetchCurrentMeetingInfo(classId),
    enabled: Boolean(classId),
  });
}

export function useAssignSubstitute(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { substituteTeacherId: string; reason: string }) =>
      assignSubstitute({ classId, ...input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meetingInfoKey(classId) });
      queryClient.invalidateQueries({ queryKey: timelineKey(classId) });
      toast.success("Substitute teacher berhasil ditugaskan");
    },
    onError: (error) =>
      toast.error("Gagal menugaskan substitute", { description: error.message }),
  });
}

/** Assigns a one-off substitute for an arbitrary meeting/date (not just
 * "today's" meeting) — used by the admin-facing "Ganti Tutor" control on
 * each Class Timeline row. */
export function useAssignSubstituteForLessonPlan(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      lessonPlanId: string;
      scheduledDate: string;
      substituteTeacherId: string;
      reason: string;
    }) => assignSubstituteForLessonPlan({ classId, ...input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meetingInfoKey(classId) });
      queryClient.invalidateQueries({ queryKey: timelineKey(classId) });
      toast.success("Tutor pengganti berhasil ditugaskan");
    },
    onError: (error) =>
      toast.error("Gagal menugaskan tutor pengganti", { description: error.message }),
  });
}

export function useCancelSubstitute(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (meetingId: string) => cancelSubstitute(meetingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meetingInfoKey(classId) });
      queryClient.invalidateQueries({ queryKey: timelineKey(classId) });
      toast.success("Substitute dibatalkan");
    },
    onError: (error) =>
      toast.error("Gagal membatalkan substitute", { description: error.message }),
  });
}

export function useHandoverSummary(classId: string, lessonPlanId: string | null) {
  return useQuery({
    queryKey: ["handover-summary", classId, lessonPlanId],
    queryFn: () => fetchHandoverSummary(classId, lessonPlanId!),
    enabled: Boolean(classId && lessonPlanId),
  });
}
