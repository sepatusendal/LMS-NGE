import { createClient } from "@/lib/supabase/client";
import { fetchAllPages } from "@/lib/supabase/paginate";

export interface StudentEnrollment {
  enrollmentId: string;
  studentId: string;
  classId: string;
  className: string;
}

interface SchoolEnrollmentRow {
  id: string;
  studentId: string;
  classId: string;
  classes: { name: string } | null;
}

/** Every active enrollment in a school's classes — one query for the whole
 * students table so each row can show its classes without N+1 lookups. */
export async function fetchSchoolEnrollments(schoolId: string): Promise<StudentEnrollment[]> {
  const supabase = createClient();
  const rows = await fetchAllPages<SchoolEnrollmentRow>((from, to) =>
    supabase
      .from("class_enrollments")
      .select("id, studentId, classId, classes!inner(name, schoolId, deletedAt)")
      .eq("classes.schoolId", schoolId)
      .is("classes.deletedAt", null)
      .is("unenrolledAt", null)
      .order("id")
      .range(from, to),
  );

  return rows.map((row) => ({
    enrollmentId: row.id,
    studentId: row.studentId,
    classId: row.classId,
    className: row.classes?.name ?? "-",
  }));
}

/** Move = enroll in the target first, then leave the source, so a failure
 * midway never strands the student without a class. */
export async function moveStudent(studentId: string, fromEnrollmentId: string, toClassId: string) {
  await enrollStudent(toClassId, studentId);
  await unenrollStudent(fromEnrollmentId);
}

export interface RosterStudent {
  enrollmentId: string;
  studentId: string;
  fullName: string;
  nis: string | null;
}

interface EnrollmentRow {
  id: string;
  studentId: string;
  students: { fullName: string; nis: string | null } | null;
}

export async function fetchClassRoster(classId: string): Promise<RosterStudent[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("class_enrollments")
    .select("id, studentId, students(fullName, nis)")
    .eq("classId", classId)
    .is("unenrolledAt", null);
  if (error) throw error;

  return (data as unknown as EnrollmentRow[]).map((row) => ({
    enrollmentId: row.id,
    studentId: row.studentId,
    fullName: row.students?.fullName ?? "-",
    nis: row.students?.nis ?? null,
  }));
}

export async function fetchTeacherStudentCount(classIds: string[]): Promise<number> {
  if (classIds.length === 0) return 0;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("class_enrollments")
    .select("studentId")
    .in("classId", classIds)
    .is("unenrolledAt", null);
  if (error) throw error;

  return new Set((data as { studentId: string }[]).map((row) => row.studentId)).size;
}

/** Unenrolling is a soft delete (`unenrolledAt`), and (studentId, classId) is
 * unique — so re-adding a student to a class they left must revive that row
 * instead of inserting a second one. */
export async function enrollStudent(classId: string, studentId: string) {
  const supabase = createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("class_enrollments")
    .upsert(
      { classId, studentId, enrolledAt: now, unenrolledAt: null, updatedAt: now },
      { onConflict: "studentId,classId" },
    );
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
