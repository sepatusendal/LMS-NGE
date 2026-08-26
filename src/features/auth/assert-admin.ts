import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Shared role lookup so the "is this user an ADMIN" check can't drift
 * between call sites (route handlers, server actions). Takes an
 * already-created client + user id rather than creating its own, since
 * every caller has already authenticated the request. */
export async function isAdminUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<boolean> {
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();
  return profile?.role === "ADMIN";
}

export async function assertIsAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (!(await isAdminUser(supabase, user.id))) {
    throw new Error("Only Admin can do this");
  }
}
