import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface CurrentUser {
  fullName: string;
  email: string;
  role: string;
}

async function fetchCurrentUser(): Promise<CurrentUser> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("users")
    .select("fullName, email, role")
    .eq("id", user.id)
    .single();
  if (error) throw error;

  return data as unknown as CurrentUser;
}

export function useCurrentUser() {
  return useQuery({ queryKey: ["current-user"], queryFn: fetchCurrentUser });
}
