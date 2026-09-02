import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface UploadResult {
  driveFileId: string;
  webViewLink: string;
}

async function uploadToDrive(
  file: File,
  folder: string | undefined,
  fallbackErrorMessage: string,
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  if (folder) formData.append("folder", folder);

  const res = await fetch("/api/drive/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || fallbackErrorMessage);
  }

  return res.json();
}

export function useDriveUpload() {
  const t = useTranslations("fileUpload.toasts");
  return useMutation({
    mutationFn: ({ file, folder }: { file: File; folder?: string }) =>
      uploadToDrive(file, folder, t("uploadFailed")),
    onSuccess: () => {
      toast.success(t("uploadSuccess"));
    },
    onError: (error) =>
      toast.error(t("uploadError"), { description: error.message }),
  });
}
