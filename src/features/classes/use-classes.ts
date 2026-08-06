import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createClassRecord,
  fetchClasses,
  setClassActive,
  updateClassRecord,
} from "./queries";
import type { ClassInput } from "./schema";

const CLASSES_KEY = ["classes"];

export function useClasses() {
  return useQuery({ queryKey: CLASSES_KEY, queryFn: fetchClasses });
}

export function useCreateClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ClassInput) => createClassRecord(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLASSES_KEY });
      toast.success("Kelas berhasil ditambahkan");
    },
    onError: (error) =>
      toast.error("Gagal menambahkan kelas", { description: error.message }),
  });
}

export function useUpdateClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ClassInput }) =>
      updateClassRecord(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLASSES_KEY });
      toast.success("Kelas berhasil diperbarui");
    },
    onError: (error) =>
      toast.error("Gagal memperbarui kelas", { description: error.message }),
  });
}

export function useSetClassActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setClassActive(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLASSES_KEY }),
    onError: (error) =>
      toast.error("Gagal mengubah status kelas", { description: error.message }),
  });
}
