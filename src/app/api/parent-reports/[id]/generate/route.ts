import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@/lib/supabase/server";
import { uploadFile } from "@/lib/google-drive/drive-client";
import { getStudentPeriodData } from "@/features/parent-reports/period-data";
import { ParentReportPdf } from "@/features/parent-reports/parent-report-pdf";
import { MONTH_LABEL } from "@/features/parent-reports/schema";

function getLogoBase64(): string {
  try {
    const logoPath = resolve(process.cwd(), "public/brand/nufa-logo.png");
    const buf = readFileSync(logoPath);
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return "";
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: report, error: reportError } = await supabase
    .from("parent_reports")
    .select("id, studentId, periodMonth, periodYear, teacherCommentsFinal")
    .eq("id", id)
    .single();
  if (reportError || !report) {
    return NextResponse.json({ error: "Parent report tidak ditemukan" }, { status: 404 });
  }

  try {
    const periodData = await getStudentPeriodData(
      supabase,
      report.studentId,
      report.periodMonth,
      report.periodYear,
    );

    const logoBase64 = getLogoBase64();
    const pdfBuffer = await renderToBuffer(
      ParentReportPdf({
        data: periodData,
        teacherComments: report.teacherCommentsFinal ?? "",
        logoBase64,
      }),
    );

    let driveFileId: string | null = null;
    let pdfFileName: string | null = null;

    try {
      const safeStudentName = periodData.studentName.replace(/[^a-zA-Z0-9]+/g, "-");
      pdfFileName = `Laporan-${safeStudentName}-${MONTH_LABEL[report.periodMonth]}-${report.periodYear}.pdf`;
      const result = await uploadFile(
        Buffer.from(pdfBuffer),
        pdfFileName,
        "application/pdf",
      );
      driveFileId = result.driveFileId;
    } catch (e) {
      const driveError = e instanceof Error ? e.message : "Unknown Drive error";
      console.warn("Drive upload failed:", driveError);
      // Do not mark the report as GENERATED when the PDF was never archived
      // to Drive — leave status as-is so an admin can retry generation.
      return NextResponse.json(
        { error: `Gagal mengunggah PDF ke Google Drive: ${driveError}` },
        { status: 502 },
      );
    }

    const { error: updateError } = await supabase
      .from("parent_reports")
      .update({
        status: "GENERATED",
        pdfDriveFileId: driveFileId,
        pdfFileName,
        generatedByUserId: user.id,
        generatedAt: new Date().toISOString(),
      })
      .eq("id", id);
    if (updateError) throw updateError;

    return NextResponse.json({ pdfDriveFileId: driveFileId, pdfFileName });
  } catch (error) {
    console.error("Parent report generation error:", error);
    return NextResponse.json({ error: "Gagal generate PDF" }, { status: 500 });
  }
}
