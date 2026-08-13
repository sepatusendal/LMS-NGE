"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { assertIsAdmin } from "@/features/auth/assert-admin";
import { teacherCreateSchema, type TeacherCreateInput } from "./schema";

export async function createTeacherAccount(rawInput: TeacherCreateInput) {
  await assertIsAdmin();
  const input = teacherCreateSchema.parse(rawInput);

  const admin = createAdminClient();

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName, role: "TEACHER" },
  });
  if (authError || !authData.user) {
    throw new Error(authError?.message ?? "Gagal membuat akun");
  }

  const { error: teacherError } = await admin
    .from("teachers")
    .insert({
      userId: authData.user.id,
      tutorId: input.tutorId || null,
      feePerMeeting: input.feePerMeeting ? Number(input.feePerMeeting) : null,
      phone: input.phone || null,
    });
  if (teacherError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    if (teacherError.code === "23505") {
      throw new Error("Tutor ID sudah dipakai teacher lain");
    }
    throw new Error(teacherError.message);
  }

  return { email: input.email };
}

/** ~100 years — Supabase's `updateUserById` requires a duration, not a
 * boolean; there's no "ban forever" value, so this is the practical
 * equivalent until re-activated. */
const PERMANENT_BAN_DURATION = "876000h";

export async function setTeacherActiveAction(
  teacherId: string,
  userId: string,
  isActive: boolean,
) {
  await assertIsAdmin();
  const admin = createAdminClient();

  const { error: updateError } = await admin
    .from("teachers")
    .update({ isActive })
    .eq("id", teacherId);
  if (updateError) throw new Error(updateError.message);

  const { error: banError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: isActive ? "none" : PERMANENT_BAN_DURATION,
  });
  if (banError) throw new Error(banError.message);
}

export async function resetTeacherPassword(userId: string, password: string) {
  await assertIsAdmin();
  const admin = createAdminClient();

  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) throw new Error(error.message);
}
