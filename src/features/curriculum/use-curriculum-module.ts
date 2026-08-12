"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface UploadModuleArgs {
  curriculumId: string;
  file: File;
  onProgress?: (percent: number) => void;
}

const CURRICULUMS_KEY = ["curriculums"];

async function uploadCurriculumModule({ curriculumId, file, onProgress }: UploadModuleArgs) {
  const initRes = await fetch(`/api/curriculum/${curriculumId}/module/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, fileSize: file.size }),
  });
  if (!initRes.ok) {
    const err = await initRes.json().catch(() => ({}));
    throw new Error(err.error || "Gagal memulai upload");
  }
  const { uploadUrl } = (await initRes.json()) as { uploadUrl: string };

  // PUT straight to Google's pre-authenticated session URL — the file's
  // bytes never touch our own server, so a 100MB+ module doesn't hit
  // Vercel's serverless request-body limits.
  const driveFileId = await new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", "application/pdf");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as { id: string };
          resolve(data.id);
        } catch {
          reject(new Error("Gagal membaca respons Drive"));
        }
      } else {
        reject(new Error(`Upload ke Drive gagal (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload ke Drive gagal"));
    xhr.send(file);
  });

  const completeRes = await fetch(`/api/curriculum/${curriculumId}/module/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ driveFileId, fileName: file.name, fileSize: file.size }),
  });
  if (!completeRes.ok) {
    const err = await completeRes.json().catch(() => ({}));
    throw new Error(err.error || "Gagal menyimpan modul");
  }
}

export function useUploadCurriculumModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadCurriculumModule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRICULUMS_KEY });
      toast.success("Modul berhasil diupload");
    },
    onError: (error: Error) =>
      toast.error("Gagal upload modul", { description: error.message }),
  });
}

export function useDeleteCurriculumModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (curriculumId: string) => {
      const res = await fetch(`/api/curriculum/${curriculumId}/module`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal menghapus modul");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRICULUMS_KEY });
      toast.success("Modul dihapus");
    },
    onError: (error: Error) =>
      toast.error("Gagal menghapus modul", { description: error.message }),
  });
}
