import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MONTH_LABEL } from "@/features/parent-reports/schema";

export async function GET(request: NextRequest) {
  const nis = request.nextUrl.searchParams.get("nis");
  if (!nis) {
    return NextResponse.json({ error: "NIS diperlukan" }, { status: 400 });
  }

  // Parents have no account (context.md Section 9) — this endpoint is
  // deliberately public, gated by knowledge of the exact NIS rather than a
  // session. RLS has no anon policy on students/parent_reports, so the
  // service-role client is required here for the lookup to return anything.
  const supabase = createAdminClient();

  const { data: studentRows, error: studentErr } = await supabase
    .from("students")
    .select("id, fullName, schools(name)")
    .eq("nis", nis)
    .is("deletedAt", null);

  if (studentErr || !studentRows || studentRows.length === 0) {
    return NextResponse.json(
      { error: "NIS tidak ditemukan. Pastikan NIS yang dimasukkan benar." },
      { status: 404 },
    );
  }

  const student = studentRows[0] as unknown as {
    id: string;
    fullName: string;
    schools: { name: string } | { name: string }[] | null;
  };

  const { data: reports, error: reportErr } = await supabase
    .from("parent_reports")
    .select("id, periodMonth, periodYear, pdfDriveFileId, pdfFileName, status")
    .eq("studentId", (student as { id: string }).id)
    .order("periodYear", { ascending: false })
    .order("periodMonth", { ascending: false });

  if (reportErr || !reports || reports.length === 0) {
    return NextResponse.json(
      { error: "Belum ada laporan untuk siswa ini." },
      { status: 404 },
    );
  }

  const generatedReports = (reports as unknown as Array<{
    id: string;
    periodMonth: number;
    periodYear: number;
    pdfDriveFileId: string | null;
    pdfFileName: string | null;
    status: string;
  }>).filter((r) => r.status === "GENERATED");

  if (generatedReports.length === 0) {
    return NextResponse.json(
      { error: "Laporan untuk siswa ini sedang disiapkan, belum tersedia untuk diunduh." },
      { status: 404 },
    );
  }

  const studentRow = student; // use the first entry

  return NextResponse.json({
    studentName: studentRow.fullName,
    schoolName: toOneSchoolName(studentRow.schools),
    reports: generatedReports.map((r) => ({
      id: r.id,
      periodLabel: `${MONTH_LABEL[r.periodMonth]} ${r.periodYear}`,
      downloadUrl: `/api/parent-reports/${r.id}/download`,
      status: r.status,
    })),
  });
}

function toOneSchoolName(schools: { name: string } | { name: string }[] | null): string {
  if (!schools) return "-";
  if (Array.isArray(schools)) return schools[0]?.name ?? "-";
  return schools.name ?? "-";
}
