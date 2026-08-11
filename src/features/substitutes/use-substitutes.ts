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

function statusBoardKey(date: string) {
  return ["monitoring-status-board", date];
}

export function useCurrentMeetingInfo(classId: string) {
  return useQuery({
    queryKey: meetingInfoKey(classId),
    queryFn: () => fetchCurrentMeetingInfo(classId),
    enabled: Boolean(classId),
  });
}

// Status board data is keyed by date (["monitoring-status-board", date]) —
// mutations here don't always know which date's board is currently open on
// screen, so invalidate every status-board query rather than one specific
// date; it's a cheap refetch and guarantees the board never goes stale.
function invalidateStatusBoards(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["monitoring-status-board"] });
}

export function useAssignSubstitute(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { substituteTeacherId: string; reason: string }) =>
      assignSubstitute({ classId, ...input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meetingInfoKey(classId) });
      queryClient.invalidateQueries({ queryKey: timelineKey(classId) });
      invalidateStatusBoards(queryClient);
      toast.success("Substitute teacher berhasil ditugaskan");
    },
    onError: (error) =>
      toast.error("Gagal menugaskan substitute", { description: error.message }),
  });
}

/** Assigns a one-off substitute for an arbitrary meeting/date (not just
 * "today's" meeting) — used by the admin-facing "Ganti Tutor" control on
 * each Class Timeline row and the Status Board's per-class action. */
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
      invalidateStatusBoards(queryClient);
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
      invalidateStatusBoards(queryClient);
      toast.success("Substitute dibatalkan");
    },
    onError: (error) =>
      toast.error("Gagal membatalkan substitute", { description: error.message }),
  });
}

export interface TeacherAbsenceAssignment {
  classId: string;
  className: string;
  lessonPlanId: string;
  scheduledDate: string;
}

interface MarkTeacherAbsentResult {
  succeeded: TeacherAbsenceAssignment[];
  failed: Array<{ assignment: TeacherAbsenceAssignment; message: string }>;
}

/** Marks a teacher absent for a date by assigning the same substitute +
 * reason to every one of their classes that day in one action — the
 * teacher-centric counterpart to the single-class useAssignSubstituteForLessonPlan
 * above ("Latifa is out Monday" should be one action, not one per class).
 *
 * Uses allSettled rather than Promise.all: one class failing (e.g. it was
 * already substituted/checked-in, or a race with another admin) must not
 * discard the other classes that already succeeded server-side. Every
 * settled assignment gets its cache invalidated regardless of outcome, and
 * the caller finds out exactly which classes failed instead of one opaque
 * error toast masking partial success. */
export function useMarkTeacherAbsent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      assignments: TeacherAbsenceAssignment[];
      substituteTeacherId: string;
      reason: string;
    }): Promise<MarkTeacherAbsentResult> => {
      const results = await Promise.allSettled(
        input.assignments.map((a) =>
          assignSubstituteForLessonPlan({
            classId: a.classId,
            lessonPlanId: a.lessonPlanId,
            scheduledDate: a.scheduledDate,
            substituteTeacherId: input.substituteTeacherId,
            reason: input.reason,
          }),
        ),
      );

      const succeeded: TeacherAbsenceAssignment[] = [];
      const failed: MarkTeacherAbsentResult["failed"] = [];
      results.forEach((result, i) => {
        const assignment = input.assignments[i];
        if (result.status === "fulfilled") {
          succeeded.push(assignment);
        } else {
          failed.push({
            assignment,
            message:
              result.reason instanceof Error ? result.reason.message : "Gagal menugaskan",
          });
        }
      });
      return { succeeded, failed };
    },
    onSuccess: ({ succeeded, failed }) => {
      succeeded.forEach((a) => {
        queryClient.invalidateQueries({ queryKey: meetingInfoKey(a.classId) });
        queryClient.invalidateQueries({ queryKey: timelineKey(a.classId) });
      });
      if (succeeded.length > 0) invalidateStatusBoards(queryClient);

      if (failed.length === 0) {
        toast.success("Guru pengganti berhasil ditugaskan ke semua kelas");
      } else if (succeeded.length === 0) {
        toast.error("Gagal menugaskan guru pengganti ke semua kelas", {
          description: failed.map((f) => `${f.assignment.className}: ${f.message}`).join("; "),
        });
      } else {
        toast.warning(
          `Berhasil untuk ${succeeded.length} kelas, gagal untuk ${failed.length} kelas`,
          {
            description: failed.map((f) => `${f.assignment.className}: ${f.message}`).join("; "),
          },
        );
      }
    },
    onError: (error) =>
      toast.error("Gagal menandai guru absen", { description: error.message }),
  });
}

export function useHandoverSummary(classId: string, lessonPlanId: string | null) {
  return useQuery({
    queryKey: ["handover-summary", classId, lessonPlanId],
    queryFn: () => fetchHandoverSummary(classId, lessonPlanId!),
    enabled: Boolean(classId && lessonPlanId),
  });
}
