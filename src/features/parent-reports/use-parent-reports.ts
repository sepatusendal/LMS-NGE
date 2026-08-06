import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchOrCreateDraft, fetchParentReports, updateDraftComment } from "./queries";

export function useParentReports() {
  return useQuery({ queryKey: ["parent-reports"], queryFn: fetchParentReports });
}

export function useParentReportDraft(studentId: string, periodMonth: number, periodYear: number) {
  return useQuery({
    queryKey: ["parent-report-draft", studentId, periodMonth, periodYear],
    queryFn: () => fetchOrCreateDraft(studentId, periodMonth, periodYear),
    enabled: Boolean(studentId),
  });
}

export function useUpdateDraftComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => updateDraftComment(id, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-report-draft"] });
      toast.success("Komentar tersimpan");
    },
    onError: (error) => toast.error("Gagal menyimpan komentar", { description: error.message }),
  });
}

export function useGenerateParentReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/parent-reports/${id}/generate`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Gagal generate PDF");
      }
      return res.json() as Promise<{
        pdfDriveFileId: string | null;
        pdfFileName: string | null;
      }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["parent-report-draft"] });
      queryClient.invalidateQueries({ queryKey: ["parent-reports"] });
      toast.success(
        data.pdfDriveFileId
          ? "PDF berhasil digenerate & tersimpan di Drive"
          : "PDF berhasil digenerate — bisa diunduh atau diakses orang tua lewat /parent-report",
      );
    },
    onError: (error) => toast.error("Gagal generate PDF", { description: error.message }),
  });
}
