import { createClient } from "@/lib/supabase/client";
import type { Teacher, TeacherEditInput } from "./schema";

interface TeacherRow {
  id: string;
  userId: string;
  tutorId: string | null;
  feePerMeeting: number | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  users: { fullName: string; email: string } | null;
}

export async function fetchTeachers(): Promise<Teacher[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("teachers")
    .select("id, userId, tutorId, feePerMeeting, phone, isActive, createdAt, users(fullName, email)")
    .is("deletedAt", null)
    .order("createdAt", { ascending: false });
  if (error) throw error;

  return (data as unknown as TeacherRow[]).map((row) => ({
    id: row.id,
    userId: row.userId,
    tutorId: row.tutorId,
    feePerMeeting: row.feePerMeeting,
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
      feePerMeeting: input.feePerMeeting ? Number(input.feePerMeeting) : null,
      phone: input.phone || null,
    })
    .eq("id", id);
  if (teacherError) {
    if (teacherError.code === "23505") {
      throw new Error("Tutor ID sudah dipakai teacher lain");
    }
    throw teacherError;
  }

  const { error: userError } = await supabase
    .from("users")
    .update({ fullName: input.fullName })
    .eq("id", userId);
  if (userError) throw userError;
}
