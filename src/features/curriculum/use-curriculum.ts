import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createCurriculum,
  fetchCurriculums,
  setCurriculumActive,
  updateCurriculum,
} from "./queries";
import type { CurriculumInput } from "./schema";

const CURRICULUMS_KEY = ["curriculums"];

export function useCurriculums() {
  return useQuery({ queryKey: CURRICULUMS_KEY, queryFn: fetchCurriculums });
}

export function useCreateCurriculum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CurriculumInput) => createCurriculum(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRICULUMS_KEY });
      toast.success("Kurikulum berhasil ditambahkan");
    },
    onError: (error) =>
      toast.error("Gagal menambahkan kurikulum", { description: error.message }),
  });
}

export function useUpdateCurriculum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CurriculumInput }) =>
      updateCurriculum(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRICULUMS_KEY });
      toast.success("Kurikulum berhasil diperbarui");
    },
    onError: (error) =>
      toast.error("Gagal memperbarui kurikulum", { description: error.message }),
  });
}

export function useSetCurriculumActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setCurriculumActive(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CURRICULUMS_KEY }),
    onError: (error) =>
      toast.error("Gagal mengubah status kurikulum", { description: error.message }),
  });
}
