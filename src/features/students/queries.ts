import { createClient } from "@/lib/supabase/client";
import { fetchAllPages } from "@/lib/supabase/paginate";
import { enrollStudent } from "@/features/classes/roster-queries";
import type { Student, StudentInput, StudentType } from "./schema";

interface StudentRow {
  id: string;
  fullName: string;
  schoolId: string;
  nis: string | null;
  studentType: StudentType;
  isActive: boolean;
  createdAt: string;
  schools: { name: string } | null;
}

function mapStudentRow(row: StudentRow): Student {
  return {
    id: row.id,
    fullName: row.fullName,
    schoolId: row.schoolId,
    schoolName: row.schools?.name ?? "-",
    nis: row.nis,
    studentType: row.studentType,
    isActive: row.isActive,
    createdAt: row.createdAt,
  };
}

/** Search-as-you-type lookup, capped at `limit` results — for pickers where
 * fetching every student up front doesn't scale (schools with hundreds or
 * thousands of students). Returns nothing for an empty query rather than
 * falling back to a full list. */
export async function searchStudents({
  query,
  schoolId,
  limit = 20,
}: {
  query: string;
  schoolId?: string;
  limit?: number;
}): Promise<Student[]> {
  const q = query.trim();
  if (!q) return [];

  const supabase = createClient();
  let dbQuery = supabase
    .from("students")
    .select("id, fullName, schoolId, nis, studentType, isActive, createdAt, schools(name)")
    .is("deletedAt", null)
    .ilike("fullName", `%${q}%`)
    .order("fullName")
    .limit(limit);

  if (schoolId) {
    dbQuery = dbQuery.eq("schoolId", schoolId);
  }

  const { data, error } = await dbQuery;
  if (error) throw error;

  return (data as unknown as StudentRow[]).map(mapStudentRow);
}

/** `excludeTeacherTraining` drops Guru & Staff English-course trainees (see
 * scripts/seed-teacher-training.ts) — rows that live in the same `students`
 * table but aren't real K-12 students. Pass it for headcount-style
 * aggregates (e.g. dashboard "Siswa Aktif"); leave it off for
 * management/roster views that legitimately need to see every row. */
export async function fetchStudents(
  schoolId?: string,
  options?: { excludeTeacherTraining?: boolean },
): Promise<Student[]> {
  const supabase = createClient();
  // Paged — this also backs headcounts (dashboard "Siswa Aktif"), which a
  // response silently truncated at 1000 rows would under-count.
  const rows = await fetchAllPages<StudentRow>((from, to) => {
    let query = supabase
      .from("students")
      .select("id, fullName, schoolId, nis, studentType, isActive, createdAt, schools(name)")
      .is("deletedAt", null)
      .order("fullName")
      .order("id");

    if (schoolId) {
      query = query.eq("schoolId", schoolId);
    }
    if (options?.excludeTeacherTraining) {
      query = query.eq("studentType", "REGULAR");
    }
    return query.range(from, to);
  });

  return rows.map(mapStudentRow);
}

function toPayload(input: StudentInput) {
  return {
    fullName: input.fullName,
    schoolId: input.schoolId,
    nis: input.nis || null,
  };
}

// students_schoolId_nis_active_key (20260916050000) — NIS must be unique
// within a school. Surface that as a clear message instead of the raw
// Postgres constraint-violation text.
function throwFriendlyNisError(error: { code?: string; message: string }): never {
  if (error.code === "23505") {
    throw new Error("NIS ini sudah dipakai siswa lain di sekolah yang sama");
  }
  throw new Error(error.message);
}

export async function createStudent(input: StudentInput) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("students")
    .insert(toPayload(input))
    .select("id")
    .single();
  if (error) throwFriendlyNisError(error);

  if (input.classId) {
    await enrollStudent(input.classId, data.id);
  }
}

export async function updateStudent(id: string, input: StudentInput) {
  const supabase = createClient();
  const { error } = await supabase
    .from("students")
    .update(toPayload(input))
    .eq("id", id);
  if (error) throwFriendlyNisError(error);
}

export async function setStudentActive(id: string, isActive: boolean) {
  const supabase = createClient();
  const { error } = await supabase
    .from("students")
    .update({ isActive })
    .eq("id", id);
  if (error) throw error;
}
