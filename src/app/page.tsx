import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleLandingPath, type AppRole } from "@/features/auth/role-routes";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  redirect(roleLandingPath[(profile?.role as AppRole) ?? "TEACHER"]);
}
