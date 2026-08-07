import { createClient } from "@/lib/supabase/client";
import type { AppUser, UserEditInput } from "./schema";

export async function fetchAppUsers(): Promise<AppUser[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, fullName, email, role, isActive, createdAt")
    .in("role", ["ADMIN", "COORDINATOR"])
    .is("deletedAt", null)
    .order("createdAt", { ascending: false });
  if (error) throw error;

  return data as unknown as AppUser[];
}

export async function updateAppUser(id: string, input: UserEditInput) {
  const supabase = createClient();
  const { error } = await supabase
    .from("users")
    .update({ fullName: input.fullName })
    .eq("id", id);
  if (error) throw error;
}
