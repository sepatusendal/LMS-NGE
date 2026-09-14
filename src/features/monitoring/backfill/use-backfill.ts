import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { backfillMeetingAdmin, type BackfillMeetingInput } from "./queries";

export function useBackfillMeeting() {
  const queryClient = useQueryClient();
  const t = useTranslations("admin.backfillDialog");

  return useMutation({
    mutationFn: (input: BackfillMeetingInput) => backfillMeetingAdmin(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitoring-status-board"] });
      queryClient.invalidateQueries({ queryKey: ["class-timeline"] });
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      toast.success(t("backfillSuccess"));
    },
    onError: (error) => toast.error(t("backfillError"), { description: error.message }),
  });
}
