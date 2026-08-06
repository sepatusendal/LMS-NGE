import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createSchool,
  fetchSchools,
  setSchoolActive,
  updateSchool,
} from "./queries";
import type { SchoolInput } from "./schema";

const SCHOOLS_KEY = ["schools"];

export function useSchools() {
  return useQuery({ queryKey: SCHOOLS_KEY, queryFn: fetchSchools });
}

export function useCreateSchool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SchoolInput) => createSchool(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHOOLS_KEY });
      toast.success("Sekolah berhasil ditambahkan");
    },
    onError: (error) => toast.error("Gagal menambahkan sekolah", { description: error.message }),
  });
}

export function useUpdateSchool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SchoolInput }) =>
      updateSchool(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHOOLS_KEY });
      toast.success("Sekolah berhasil diperbarui");
    },
    onError: (error) => toast.error("Gagal memperbarui sekolah", { description: error.message }),
  });
}

export function useSetSchoolActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setSchoolActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHOOLS_KEY });
    },
    onError: (error) => toast.error("Gagal mengubah status sekolah", { description: error.message }),
  });
}
