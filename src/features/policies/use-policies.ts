import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  archivePacket,
  confirmPolicy,
  createPacket,
  createPacketVersion,
  deleteDraftPacket,
  deletePolicyDocument,
  fetchMyPolicies,
  fetchPacketAdmin,
  fetchPacketMonitor,
  fetchPacketsAdmin,
  publishPacket,
  updatePacket,
  uploadPolicyDocument,
} from "./queries";
import type { AcknowledgeRequest, PacketFormInput, PolicyPacket } from "./schema";

export const MY_POLICIES_KEY = ["policies", "mine"];
const ADMIN_KEY = ["policies", "admin"];

/** @param enabled only tutors have documents to confirm. */
export function useMyPolicies(enabled = true) {
  return useQuery({
    queryKey: MY_POLICIES_KEY,
    queryFn: fetchMyPolicies,
    enabled,
    refetchOnWindowFocus: true,
  });
}

export function useConfirmPolicy(packetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AcknowledgeRequest) => confirmPolicy(packetId, body),
    // Refresh after failures too: "already confirmed" means our copy is stale.
    onSettled: () => queryClient.invalidateQueries({ queryKey: MY_POLICIES_KEY }),
  });
}

export function usePacketsAdmin() {
  return useQuery({ queryKey: [...ADMIN_KEY, "list"], queryFn: fetchPacketsAdmin });
}

export function usePacketAdmin(id: string) {
  return useQuery({ queryKey: [...ADMIN_KEY, "packet", id], queryFn: () => fetchPacketAdmin(id) });
}

export function usePacketMonitor(id: string, enabled: boolean) {
  return useQuery({
    queryKey: [...ADMIN_KEY, "monitor", id],
    queryFn: () => fetchPacketMonitor(id),
    enabled,
    refetchOnWindowFocus: true,
  });
}

function useAdminMutation<TInput, TResult>(
  mutationFn: (input: TInput) => Promise<TResult>,
  successKey: string,
) {
  const queryClient = useQueryClient();
  const t = useTranslations("admin.policies.toasts");
  return useMutation({
    mutationFn,
    onSuccess: () => {
      toast.success(t(successKey));
      return queryClient.invalidateQueries({ queryKey: ADMIN_KEY });
    },
    onError: (error) => toast.error(t("failed"), { description: error.message }),
  });
}

export const useCreatePacket = () => useAdminMutation((input: PacketFormInput) => createPacket(input), "created");

export const useUpdatePacket = (packet: PolicyPacket) =>
  useAdminMutation((input: PacketFormInput) => updatePacket(packet, input), "saved");

export const usePublishPacket = () => useAdminMutation((id: string) => publishPacket(id), "published");

export const useCreatePacketVersion = () =>
  useAdminMutation((id: string) => createPacketVersion(id), "versionCreated");

export const useArchivePacket = () => useAdminMutation((id: string) => archivePacket(id), "archived");

export const useDeleteDraftPacket = () => useAdminMutation((id: string) => deleteDraftPacket(id), "draftDeleted");

export const useUploadPolicyDocument = (packetId: string) =>
  useAdminMutation((form: FormData) => uploadPolicyDocument(packetId, form), "documentAdded");

export const useDeletePolicyDocument = () =>
  useAdminMutation((documentId: string) => deletePolicyDocument(documentId), "documentRemoved");
