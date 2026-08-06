"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { teacherCreateSchema, type TeacherCreateInput } from "./schema";

function generateTempPassword() {
  return `Nge${Math.random().toString(36).slice(2, 8)}${Math.floor(Math.random() * 100)}!`;
}

async function assertIsAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "ADMIN") throw new Error("Only Admin can do this");
}

export async function createTeacherAccount(rawInput: TeacherCreateInput) {
  await assertIsAdmin();
  const input = teacherCreateSchema.parse(rawInput);

  const admin = createAdminClient();
  const tempPassword = generateTempPassword();

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: input.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: input.fullName, role: "TEACHER" },
  });
  if (authError || !authData.user) {
    throw new Error(authError?.message ?? "Gagal membuat akun");
  }

  const { error: teacherError } = await admin
    .from("teachers")
    .insert({ userId: authData.user.id, phone: input.phone || null });
  if (teacherError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    throw new Error(teacherError.message);
  }

  return { email: input.email, tempPassword };
}
