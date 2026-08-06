import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface UploadResult {
  driveFileId: string;
  webViewLink: string;
}

async function uploadToDrive(
  file: File,
  folder?: string,
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
    throw new Error(err.error || "Upload gagal");
  }

  return res.json();
}

export function useDriveUpload() {
  return useMutation({
    mutationFn: ({ file, folder }: { file: File; folder?: string }) =>
      uploadToDrive(file, folder),
    onSuccess: () => {
      toast.success("File berhasil diupload");
    },
    onError: (error) =>
      toast.error("Gagal upload file", { description: error.message }),
  });
}
