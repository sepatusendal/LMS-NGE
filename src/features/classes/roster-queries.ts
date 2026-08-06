import { createClient } from "@/lib/supabase/client";

export interface RosterStudent {
  enrollmentId: string;
  studentId: string;
  fullName: string;
}

interface EnrollmentRow {
  id: string;
  studentId: string;
  students: { fullName: string } | null;
}

export async function fetchClassRoster(classId: string): Promise<RosterStudent[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("class_enrollments")
    .select("id, studentId, students(fullName)")
    .eq("classId", classId)
    .is("unenrolledAt", null);
  if (error) throw error;

  return (data as unknown as EnrollmentRow[]).map((row) => ({
    enrollmentId: row.id,
    studentId: row.studentId,
    fullName: row.students?.fullName ?? "-",
  }));
}

export async function enrollStudent(classId: string, studentId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("class_enrollments")
    .insert({ classId, studentId });
  if (error) throw error;
}

export async function unenrollStudent(enrollmentId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("class_enrollments")
    .update({ unenrolledAt: new Date().toISOString() })
    .eq("id", enrollmentId);
  if (error) throw error;
}
