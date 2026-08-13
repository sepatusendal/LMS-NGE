import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createClassRecord,
  fetchClassById,
  fetchClasses,
  setClassActive,
  updateClassRecord,
} from "./queries";
import type { ClassInput, ClassType } from "./schema";

const CLASSES_KEY = ["classes"];
const classesKey = (classType?: ClassType) => [...CLASSES_KEY, classType ?? "ALL"];

/** Omit classType for admin-wide surfaces that should see both regular and
 * teacher-training classes; pass it to scope a list page to one type. */
export function useClasses(classType?: ClassType) {
  return useQuery({
    queryKey: classesKey(classType),
    queryFn: () => fetchClasses(classType),
  });
}

/** Fetch a single class by id, regardless of classType — for the shared
 * detail page, which routes in from both the Classes and Kelas Guru & Staff
 * submenus. */
export function useClass(id: string) {
  return useQuery({
    queryKey: ["class", id],
    queryFn: () => fetchClassById(id),
    enabled: Boolean(id),
  });
}

export function useCreateClass(classType: ClassType = "REGULAR") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ClassInput) => createClassRecord(input, classType),
    onSuccess: () => {
      // Broad prefix invalidation — a create/update on one list page should
      // also refresh admin-wide surfaces (dashboard, reports) that fetch
      // classes unscoped.
      queryClient.invalidateQueries({ queryKey: CLASSES_KEY });
      toast.success("Kelas berhasil ditambahkan");
    },
    onError: (error) =>
      toast.error("Gagal menambahkan kelas", { description: error.message }),
  });
}

export function useUpdateClass(classType: ClassType = "REGULAR") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ClassInput }) =>
      updateClassRecord(id, input, classType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLASSES_KEY });
      queryClient.invalidateQueries({ queryKey: ["class"] });
      toast.success("Kelas berhasil diperbarui");
    },
    onError: (error) =>
      toast.error("Gagal memperbarui kelas", { description: error.message }),
  });
}

export function useSetClassActive(classType: ClassType = "REGULAR") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setClassActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLASSES_KEY });
      queryClient.invalidateQueries({ queryKey: ["class"] });
    },
    onError: (error) =>
      toast.error("Gagal mengubah status kelas", { description: error.message }),
  });
}
