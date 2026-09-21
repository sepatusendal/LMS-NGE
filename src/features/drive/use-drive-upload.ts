import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { prepareUploadFile, UploadError } from "./prepare-upload-file";

interface UploadResult {
  driveFileId: string;
  webViewLink: string;
}

async function uploadToDrive(file: File, folder: string | undefined): Promise<UploadResult> {
  const prepared = await prepareUploadFile(file);

  const formData = new FormData();
  formData.append("file", prepared);
  if (folder) formData.append("folder", folder);

  let res: Response;
  try {
    res = await fetch("/api/drive/upload", { method: "POST", body: formData });
  } catch {
    throw new UploadError("NETWORK");
  }

  if (!res.ok) {
    // 413 comes from the hosting platform as plain text, not our JSON body.
    if (res.status === 413) throw new UploadError("TOO_LARGE");
    if (res.status === 401) throw new UploadError("SESSION");
    if (res.status === 403) throw new UploadError("FORBIDDEN");
    const err = await res.json().catch(() => ({}));
    throw new UploadError("SERVER", err.error);
  }

  return res.json();
}

export function useDriveUpload() {
  const t = useTranslations("fileUpload.toasts");
  return useMutation({
    mutationFn: ({ file, folder }: { file: File; folder?: string }) => uploadToDrive(file, folder),
    onSuccess: () => {
      toast.success(t("uploadSuccess"));
    },
    onError: (error) => {
      let description: string;
      if (error instanceof UploadError) {
        switch (error.code) {
          case "TOO_LARGE":
            description = t("tooLarge");
            break;
          case "NETWORK":
            description = t("network");
            break;
          case "SESSION":
            description = t("session");
            break;
          case "FORBIDDEN":
            description = t("forbidden");
            break;
          default:
            description = error.message !== "SERVER" ? error.message : t("uploadFailed");
        }
      } else {
        description = error.message || t("uploadFailed");
      }
      toast.error(t("uploadError"), { description });
    },
  });
}
