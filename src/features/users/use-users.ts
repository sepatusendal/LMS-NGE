import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchAppUsers } from "./queries";
import { createAppUser, resetAppUserPassword, setAppUserActiveAction } from "./actions";
import type { UserCreateInput } from "./schema";

const USERS_KEY = ["app-users"];

export function useAppUsers() {
  return useQuery({ queryKey: USERS_KEY, queryFn: fetchAppUsers });
}

export function useCreateAppUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UserCreateInput) => createAppUser(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
      toast.success("Akun berhasil dibuat");
    },
    onError: (error) => toast.error("Gagal membuat akun", { description: error.message }),
  });
}

export function useSetAppUserActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      setAppUserActiveAction(userId, isActive),
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
      toast.success(isActive ? "Akun diaktifkan kembali" : "Akun dinonaktifkan — login diblokir");
    },
    onError: (error) => toast.error("Gagal mengubah status akun", { description: error.message }),
  });
}

export function useResetAppUserPassword() {
  return useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      resetAppUserPassword(userId, password),
    onSuccess: () => toast.success("Password berhasil diganti"),
    onError: (error) => toast.error("Gagal reset password", { description: error.message }),
  });
}
