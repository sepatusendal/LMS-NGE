import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchMeetingAdminDetail,
  createCheckInAdmin,
  updateCheckInAdmin,
  deleteCheckInAdmin,
  createCheckOutAdmin,
  updateCheckOutAdmin,
  deleteCheckOutAdmin,
  deleteTeachingReportAdmin,
  resetMeetingAdmin,
  type CheckInCreate,
  type CheckInUpdate,
  type CheckOutCreate,
  type CheckOutUpdate,
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

  const createCheckIn = useMutation({
    mutationFn: (input: CheckInCreate) => createCheckInAdmin(meetingId as string, input),
    onSuccess: () => {
      invalidateAll();
      toast.success("Check-in berhasil ditambahkan");
    },
    onError: (error) => toast.error("Gagal menambahkan check-in", { description: error.message }),
  });

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
    onError: (error) =>
      toast.error("Gagal menghapus check-in", {
        description: error.message.includes("CHECKOUT_EXISTS")
          ? "Meeting ini sudah ada check-out. Pakai \"Reset Meeting\" di bawah untuk menghapus keduanya sekaligus."
          : error.message,
      }),
  });

  const createCheckOut = useMutation({
    mutationFn: (input: CheckOutCreate) => createCheckOutAdmin(meetingId as string, input),
    onSuccess: () => {
      invalidateAll();
      toast.success("Check-out berhasil ditambahkan");
    },
    onError: (error) =>
      toast.error("Gagal menambahkan check-out", {
        description: error.message.includes("CHECK_IN_REQUIRED_BEFORE_CHECK_OUT")
          ? "Meeting ini belum ada check-in. Tambahkan check-in dulu."
          : error.message,
      }),
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
    onError: (error) =>
      toast.error("Gagal menghapus check-out", {
        description: error.message.includes("REPORT_EXISTS")
          ? "Meeting ini sudah ada laporan mengajar. Pakai \"Reset Meeting\" di bawah untuk menghapus keduanya sekaligus."
          : error.message,
      }),
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
    createCheckIn,
    updateCheckIn,
    deleteCheckIn,
    createCheckOut,
    updateCheckOut,
    deleteCheckOut,
    deleteReport,
    resetMeeting,
  };
}
