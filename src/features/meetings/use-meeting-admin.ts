import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchMeetingAdminDetail,
  updateCheckInAdmin,
  deleteCheckInAdmin,
  updateCheckOutAdmin,
  deleteCheckOutAdmin,
  updateTeachingReportAdmin,
  deleteTeachingReportAdmin,
  resetMeetingAdmin,
  type CheckInUpdate,
  type CheckOutUpdate,
  type TeachingReportUpdate,
} from "./admin-queries";

const TODAY_CLASSES_KEY = ["today-classes"];

function meetingAdminKey(meetingId: string) {
  return ["meeting-admin", meetingId];
}

export function useMeetingAdminDetail(meetingId: string | null) {
  return useQuery({
    queryKey: meetingAdminKey(meetingId ?? ""),
    queryFn: () => fetchMeetingAdminDetail(meetingId as string),
    enabled: Boolean(meetingId),
  });
}

/** classId is only needed to invalidate the class's timeline after a
 * mutation — the timeline query is keyed by classId, not meetingId. */
export function useMeetingAdminMutations(meetingId: string | null, classId: string) {
  const queryClient = useQueryClient();

  function invalidateAll() {
    if (meetingId) queryClient.invalidateQueries({ queryKey: meetingAdminKey(meetingId) });
    queryClient.invalidateQueries({ queryKey: ["class-timeline", classId] });
    queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
    queryClient.invalidateQueries({ queryKey: TODAY_CLASSES_KEY });
  }

  const updateCheckIn = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CheckInUpdate }) =>
      updateCheckInAdmin(id, input),
    onSuccess: () => {
      invalidateAll();
      toast.success("Check-in berhasil diperbarui");
    },
    onError: (error) => toast.error("Gagal memperbarui check-in", { description: error.message }),
  });

  const deleteCheckIn = useMutation({
    mutationFn: (id: string) => deleteCheckInAdmin(id),
    onSuccess: () => {
      invalidateAll();
      toast.success("Check-in dihapus — tutor bisa check-in ulang");
    },
    onError: (error) => toast.error("Gagal menghapus check-in", { description: error.message }),
  });

  const updateCheckOut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CheckOutUpdate }) =>
      updateCheckOutAdmin(id, input),
    onSuccess: () => {
      invalidateAll();
      toast.success("Check-out berhasil diperbarui");
    },
    onError: (error) => toast.error("Gagal memperbarui check-out", { description: error.message }),
  });

  const deleteCheckOut = useMutation({
    mutationFn: (id: string) => deleteCheckOutAdmin(id),
    onSuccess: () => {
      invalidateAll();
      toast.success("Check-out dihapus");
    },
    onError: (error) => toast.error("Gagal menghapus check-out", { description: error.message }),
  });

  const updateReport = useMutation({
    mutationFn: ({ id, input }: { id: string; input: TeachingReportUpdate }) =>
      updateTeachingReportAdmin(id, input),
    onSuccess: () => {
      invalidateAll();
      toast.success("Daily Teaching Report berhasil diperbarui");
    },
    onError: (error) => toast.error("Gagal memperbarui report", { description: error.message }),
  });

  const deleteReport = useMutation({
    mutationFn: (id: string) => deleteTeachingReportAdmin(id),
    onSuccess: () => {
      invalidateAll();
      toast.success("Report dihapus");
    },
    onError: (error) => toast.error("Gagal menghapus report", { description: error.message }),
  });

  const resetMeeting = useMutation({
    mutationFn: () => resetMeetingAdmin(meetingId as string),
    onSuccess: () => {
      invalidateAll();
      toast.success("Meeting di-reset — tutor bisa mulai ulang dari check-in");
    },
    onError: (error) => toast.error("Gagal reset meeting", { description: error.message }),
  });

  return {
    updateCheckIn,
    deleteCheckIn,
    updateCheckOut,
    deleteCheckOut,
    updateReport,
    deleteReport,
    resetMeeting,
  };
}
