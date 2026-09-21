import { createClient } from "@/lib/supabase/client";
import type { Teacher, TeacherEditInput } from "./schema";

interface TeacherRow {
  id: string;
  userId: string;
  tutorId: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  // One-to-one (teacher_fees.teacherId is its primary key), but normalize both
  // shapes like the other embeds in this codebase.
  teacher_fees: { feePerMeeting: number } | { feePerMeeting: number }[] | null;
  users: { fullName: string; email: string } | null;
}

export async function fetchTeachers(): Promise<Teacher[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("teachers")
    .select("id, userId, tutorId, phone, isActive, createdAt, teacher_fees(feePerMeeting), users(fullName, email)")
    .is("deletedAt", null)
    .order("createdAt", { ascending: false });
  if (error) throw error;

  return (data as unknown as TeacherRow[]).map((row) => ({
    id: row.id,
    userId: row.userId,
    tutorId: row.tutorId,
    feePerMeeting: (Array.isArray(row.teacher_fees) ? row.teacher_fees[0] : row.teacher_fees)?.feePerMeeting ?? null,
    phone: row.phone,
    isActive: row.isActive,
    createdAt: row.createdAt,
    fullName: row.users?.fullName ?? "-",
    email: row.users?.email ?? "-",
  }));
}

export async function updateTeacher(id: string, userId: string, input: TeacherEditInput) {
  const supabase = createClient();

  const { error: teacherError } = await supabase
    .from("teachers")
    .update({
      tutorId: input.tutorId || null,
      phone: input.phone || null,
    })
    .eq("id", id);
  if (teacherError) {
    if (teacherError.code === "23505") {
      throw new Error("Tutor ID sudah dipakai teacher lain");
    }
    throw teacherError;
  }

  // Pay rate lives in its own admin-only table; no row = not set.
  if (input.feePerMeeting) {
    const { error: feeError } = await supabase
      .from("teacher_fees")
      .upsert({ teacherId: id, feePerMeeting: Number(input.feePerMeeting), updatedAt: new Date().toISOString() });
    if (feeError) throw feeError;
  } else {
    const { error: feeError } = await supabase.from("teacher_fees").delete().eq("teacherId", id);
    if (feeError) throw feeError;
  }

  const { error: userError } = await supabase
    .from("users")
    .update({ fullName: input.fullName })
    .eq("id", userId);
  if (userError) throw userError;
}
