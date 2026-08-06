import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  assignSubstitute,
  cancelSubstitute,
  fetchCurrentMeetingInfo,
  fetchHandoverSummary,
} from "./queries";

function meetingInfoKey(classId: string) {
  return ["current-meeting-info", classId];
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
      toast.success("Substitute teacher berhasil ditugaskan");
    },
    onError: (error) =>
      toast.error("Gagal menugaskan substitute", { description: error.message }),
  });
}

export function useCancelSubstitute(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (meetingId: string) => cancelSubstitute(meetingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meetingInfoKey(classId) });
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
