// One-off local preview: renders the Parent Report PDF for a given student
// straight to a file, bypassing Google Drive upload — used to review the
// PDF design without needing Drive infra configured.
//
// Run with: npx tsx scripts/render-parent-report-preview.ts <studentId> <month> <year>

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { renderToBuffer } from "@react-pdf/renderer";
import { getStudentPeriodData, draftTeacherComments } from "../src/features/parent-reports/period-data";
import { ParentReportPdf } from "../src/features/parent-reports/parent-report-pdf";

const envPath = resolve(__dirname, "../.env");
const envContent = readFileSync(envPath, "utf-8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const [key, ...vals] = line.split("=");
  if (key && vals.length) env[key.trim()] = vals.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const [studentId, monthStr, yearStr] = process.argv.slice(2);
  const month = Number(monthStr);
  const year = Number(yearStr);

  const periodData = await getStudentPeriodData(supabase, studentId, month, year);
  const comments = draftTeacherComments(periodData);

  let logoBase64 = "";
  try {
    const logoPath = resolve(__dirname, "../public/brand/nufa-logo.png");
    logoBase64 = `data:image/png;base64,${readFileSync(logoPath).toString("base64")}`;
  } catch {
    // no logo available, template falls back to text wordmark
  }

  const buffer = await renderToBuffer(ParentReportPdf({ data: periodData, teacherComments: comments, logoBase64 }));

  const outPath = resolve(__dirname, "../parent-report-preview.pdf");
  writeFileSync(outPath, buffer);
  console.log("Written to", outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
