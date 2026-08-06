import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { readFileSync } from "fs";
import { resolve } from "path";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudentPeriodData } from "@/features/parent-reports/period-data";
import { ParentReportPdf } from "@/features/parent-reports/parent-report-pdf";
import { MONTH_LABEL } from "@/features/parent-reports/schema";

function getLogoBase64(): string {
  try {
    const logoPath = resolve(process.cwd(), "public/brand/nufa-logo.png");
    return `data:image/png;base64,${readFileSync(logoPath).toString("base64")}`;
  } catch {
    return "";
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // Reached either from the admin review page (authenticated) or the public
  // parent lookup flow (no session) — service-role client so both work; the
  // report id (UUID) and prior GENERATED-status check are the access gate.
  const supabase = createAdminClient();

  const { data: report, error: reportError } = await supabase
    .from("parent_reports")
    .select("id, studentId, periodMonth, periodYear, teacherCommentsFinal, status")
    .eq("id", id)
    .single();
  if (reportError || !report) {
    return NextResponse.json({ error: "Laporan tidak ditemukan" }, { status: 404 });
  }

  if (report.status !== "GENERATED") {
    return NextResponse.json({ error: "Laporan belum digenerate" }, { status: 404 });
  }

  try {
    const periodData = await getStudentPeriodData(
      supabase,
      report.studentId,
      report.periodMonth,
      report.periodYear,
    );

    const pdfBuffer = await renderToBuffer(
      ParentReportPdf({
        data: periodData,
        teacherComments: report.teacherCommentsFinal ?? "",
        logoBase64: getLogoBase64(),
      }),
    );

    const safeName = periodData.studentName.replace(/[^a-zA-Z0-9]+/g, "-");
    const fileName = `Laporan-${safeName}-${MONTH_LABEL[report.periodMonth]}-${report.periodYear}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("PDF download error:", error);
    return NextResponse.json({ error: "Gagal generate PDF" }, { status: 500 });
  }
}
