import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createHoliday, deleteHoliday, fetchHolidays } from "./queries";
import type { HolidayInput } from "./schema";

const HOLIDAYS_KEY = ["holidays"];

export function useHolidays() {
  return useQuery({ queryKey: HOLIDAYS_KEY, queryFn: fetchHolidays });
}

export function useCreateHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: HolidayInput) => createHoliday(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOLIDAYS_KEY });
      toast.success("Hari libur berhasil ditambahkan");
    },
    onError: (error) =>
      toast.error("Gagal menambahkan hari libur", { description: error.message }),
  });
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteHoliday(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOLIDAYS_KEY });
      toast.success("Hari libur berhasil dihapus");
    },
    onError: (error) =>
      toast.error("Gagal menghapus hari libur", { description: error.message }),
  });
}
