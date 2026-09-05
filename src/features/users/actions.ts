"use server";

import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertIsAdmin } from "@/features/auth/assert-admin";
import { buildUserCreateSchema, buildUserResetPasswordSchema, type UserCreateInput } from "./schema";

export async function createAppUser(rawInput: UserCreateInput) {
  await assertIsAdmin();
  const t = await getTranslations("admin.users");
  const input = buildUserCreateSchema(t).parse(rawInput);

  const admin = createAdminClient();

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName, role: input.role },
  });
  if (authError || !authData.user) {
    throw new Error(authError?.message ?? "Gagal membuat akun");
  }

  return { email: input.email };
}

/** ~100 years — Supabase's `updateUserById` requires a duration, not a
 * boolean; there's no "ban forever" value, so this is the practical
 * equivalent until re-activated. */
const PERMANENT_BAN_DURATION = "876000h";

export async function setAppUserActiveAction(userId: string, isActive: boolean) {
  await assertIsAdmin();

  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  if (currentUser?.id === userId) {
    throw new Error("Tidak bisa menonaktifkan akun sendiri");
  }

  const admin = createAdminClient();

  const { error: updateError } = await admin
    .from("users")
    .update({ isActive })
    .eq("id", userId);
  if (updateError) throw new Error(updateError.message);

  const { error: banError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: isActive ? "none" : PERMANENT_BAN_DURATION,
  });
  if (banError) throw new Error(banError.message);
}

export async function resetAppUserPassword(userId: string, password: string) {
  await assertIsAdmin();
  const t = await getTranslations("admin.users");
  const { password: validatedPassword } = buildUserResetPasswordSchema(t).parse({ password });
  const admin = createAdminClient();

  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: validatedPassword,
  });
  if (error) throw new Error(error.message);
}
