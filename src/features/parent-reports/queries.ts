import { createClient } from "@/lib/supabase/client";
import { draftTeacherComments, getStudentPeriodData } from "./period-data";
import type { ParentReportDraft, ParentReportListItem, StudentPeriodData } from "./schema";

function toOne<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

export { draftTeacherComments };

export async function fetchStudentPeriodData(
  studentId: string,
  periodMonth: number,
  periodYear: number,
): Promise<StudentPeriodData> {
  const supabase = createClient();
  return getStudentPeriodData(supabase, studentId, periodMonth, periodYear);
}

export async function fetchParentReports(): Promise<ParentReportListItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("parent_reports")
    .select(
      "id, studentId, periodMonth, periodYear, status, pdfDriveFileId, pdfFileName, generatedAt, students(fullName, schools(name))",
    )
    .order("createdAt", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => {
    const student = toOne(
      row.students as unknown as
        | { fullName: string; schools: { name: string } | { name: string }[] | null }
        | { fullName: string; schools: { name: string } | { name: string }[] | null }[],
    );
    return {
      id: row.id as string,
      studentId: row.studentId as string,
      studentName: student?.fullName ?? "-",
      schoolName: toOne(student?.schools)?.name ?? "-",
      periodMonth: row.periodMonth as number,
      periodYear: row.periodYear as number,
      status: row.status as "DRAFT" | "GENERATED",
      pdfDriveFileId: row.pdfDriveFileId as string | null,
      pdfFileName: row.pdfFileName as string | null,
      generatedAt: row.generatedAt as string | null,
    };
  });
}

export async function fetchOrCreateDraft(
  studentId: string,
  periodMonth: number,
  periodYear: number,
): Promise<ParentReportDraft> {
  const supabase = createClient();
  const periodData = await getStudentPeriodData(supabase, studentId, periodMonth, periodYear);

  const { data: existing, error: existingError } = await supabase
    .from("parent_reports")
    .select("id, status, teacherCommentsFinal, pdfDriveFileId, pdfFileName, generatedAt")
    .eq("studentId", studentId)
    .eq("periodMonth", periodMonth)
    .eq("periodYear", periodYear)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    return {
      id: existing.id as string,
      studentId,
      periodMonth,
      periodYear,
      status: existing.status as "DRAFT" | "GENERATED",
      teacherCommentsFinal: (existing.teacherCommentsFinal as string) ?? draftTeacherComments(periodData),
      pdfDriveFileId: existing.pdfDriveFileId as string | null,
      pdfFileName: existing.pdfFileName as string | null,
      generatedAt: existing.generatedAt as string | null,
      periodData,
    };
  }

  const draftText = draftTeacherComments(periodData);
  const { data: created, error: createError } = await supabase
    .from("parent_reports")
    .insert({
      studentId,
      periodMonth,
      periodYear,
      teacherCommentsDraft: draftText,
      teacherCommentsFinal: draftText,
    })
    .select("id")
    .single();
  if (createError) throw createError;

  return {
    id: created.id as string,
    studentId,
    periodMonth,
    periodYear,
    status: "DRAFT",
    teacherCommentsFinal: draftText,
    pdfDriveFileId: null,
    pdfFileName: null,
    generatedAt: null,
    periodData,
  };
}

export async function updateDraftComment(id: string, teacherCommentsFinal: string) {
  const supabase = createClient();
  const { error } = await supabase.from("parent_reports").update({ teacherCommentsFinal }).eq("id", id);
  if (error) throw error;
}
