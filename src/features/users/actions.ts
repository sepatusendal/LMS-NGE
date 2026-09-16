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

  // This action bans any app user by id — including a TEACHER's userId,
  // even though the Users page itself only ever lists ADMIN/COORDINATOR
  // accounts (fetchAppUsers filters by role). setTeacherActiveAction
  // (features/teachers/actions.ts) has its own "still primary teacher on an
  // active class" guard, but that guard is bypassed entirely if this action
  // is called with a teacher's userId directly. Re-check here too so
  // deactivating a teacher can't silently skip it through this path.
  if (!isActive) {
    const { data: teacherRow } = await admin
      .from("teachers")
      .select("id")
      .eq("userId", userId)
      .maybeSingle();
    if (teacherRow) {
      const { data: activeClasses, error: classesError } = await admin
        .from("classes")
        .select("name")
        .eq("teacherId", (teacherRow as { id: string }).id)
        .eq("isActive", true)
        .is("deletedAt", null);
      if (classesError) throw new Error(classesError.message);
      if (activeClasses && activeClasses.length > 0) {
        const names = (activeClasses as { name: string }[]).map((c) => c.name).join(", ");
        throw new Error(
          `Masih jadi pengajar utama di ${activeClasses.length} kelas aktif (${names}) — reassign kelasnya dulu sebelum menonaktifkan.`,
        );
      }
    }
  }

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
