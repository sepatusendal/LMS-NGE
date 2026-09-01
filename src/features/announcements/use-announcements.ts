import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createAnnouncement,
  deleteAnnouncement,
  dismissAnnouncement,
  fetchAnnouncementsAdmin,
  fetchAnnouncementsForCurrentUser,
  setAnnouncementActive,
} from "./queries";
import type { AnnouncementInput } from "./schema";

const ADMIN_KEY = ["announcements", "admin"];
const FEED_KEY = ["announcements", "feed"];

export function useAnnouncementsAdmin() {
  return useQuery({ queryKey: ADMIN_KEY, queryFn: fetchAnnouncementsAdmin });
}

/** The current user's unread, active announcements — what the dashboard
 * banner renders. Refetches on window focus so a freshly-published
 * announcement shows up without a manual reload. */
export function useMyAnnouncements() {
  return useQuery({
    queryKey: FEED_KEY,
    queryFn: fetchAnnouncementsForCurrentUser,
    refetchOnWindowFocus: true,
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AnnouncementInput) => createAnnouncement(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEY });
      queryClient.invalidateQueries({ queryKey: FEED_KEY });
      toast.success("Pengumuman berhasil dipublikasikan");
    },
    onError: (error) =>
      toast.error("Gagal membuat pengumuman", { description: error.message }),
  });
}

export function useSetAnnouncementActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setAnnouncementActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEY });
      queryClient.invalidateQueries({ queryKey: FEED_KEY });
    },
    onError: (error) =>
      toast.error("Gagal mengubah status pengumuman", { description: error.message }),
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEY });
      queryClient.invalidateQueries({ queryKey: FEED_KEY });
      toast.success("Pengumuman berhasil dihapus");
    },
    onError: (error) =>
      toast.error("Gagal menghapus pengumuman", { description: error.message }),
  });
}

export function useDismissAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dismissAnnouncement(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: FEED_KEY });
      const previous = queryClient.getQueryData(FEED_KEY);
      queryClient.setQueryData(FEED_KEY, (old: { id: string }[] | undefined) =>
        (old ?? []).filter((a) => a.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(FEED_KEY, context.previous);
    },
  });
}
