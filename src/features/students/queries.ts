import { createClient } from "@/lib/supabase/client";
import type { Student, StudentInput } from "./schema";

interface StudentRow {
  id: string;
  fullName: string;
  schoolId: string;
  nis: string | null;
  isActive: boolean;
  createdAt: string;
  schools: { name: string } | null;
}

export async function fetchStudents(): Promise<Student[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("students")
    .select("id, fullName, schoolId, nis, isActive, createdAt, schools(name)")
    .is("deletedAt", null)
    .order("fullName");
  if (error) throw error;

  return (data as unknown as StudentRow[]).map((row) => ({
    id: row.id,
    fullName: row.fullName,
    schoolId: row.schoolId,
    schoolName: row.schools?.name ?? "-",
    nis: row.nis,
    isActive: row.isActive,
    createdAt: row.createdAt,
  }));
}

function toPayload(input: StudentInput) {
  return {
    fullName: input.fullName,
    schoolId: input.schoolId,
    nis: input.nis || null,
  };
}

export async function createStudent(input: StudentInput) {
  const supabase = createClient();
  const { error } = await supabase.from("students").insert(toPayload(input));
  if (error) throw error;
}

export async function updateStudent(id: string, input: StudentInput) {
  const supabase = createClient();
  const { error } = await supabase
    .from("students")
    .update(toPayload(input))
    .eq("id", id);
  if (error) throw error;
}

export async function setStudentActive(id: string, isActive: boolean) {
  const supabase = createClient();
  const { error } = await supabase
    .from("students")
    .update({ isActive })
    .eq("id", id);
  if (error) throw error;
}
