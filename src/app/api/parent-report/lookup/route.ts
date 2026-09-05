import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MONTH_LABEL } from "@/features/parent-reports/schema";
import { getClientIp, peekRateLimit, rateLimit } from "@/lib/rate-limit";

// NIS is a short, sequential, guessable identifier — without a limit, this
// public endpoint lets anyone enumerate every student's name and school.
const LOOKUP_LIMIT = { limit: 8, windowMs: 60_000 };

// Per-IP limiting alone doesn't stop an attacker rotating IPs. Also cap
// lookups per submitted NIS regardless of who's asking, so brute-forcing a
// single NIS (or scripted enumeration across many) stays bounded even from a
// rotating-IP source.
const NIS_LOOKUP_LIMIT = { limit: 5, windowMs: 10 * 60_000 };

// Neither tier above fully closes enumeration from a patient, IP-rotating
// attacker: NIS_LOOKUP_LIMIT resets every 10 minutes, so a slow scripted
// guesser can keep probing a NIS indefinitely, just throttled. This tier
// layers a much harsher, longer lockout on top, keyed only off *failed*
// lookups (student not found / no report available) for that specific NIS —
// 3 misses trips a full 1-hour lock on that NIS, regardless of IP. It never
// increments on a successful lookup, so a real parent re-checking their own
// NIS repeatedly is never punished by it. There's no CAPTCHA provider wired
// into this project, so this in-memory escalating lockout (via the same
// rate-limit utility, under its own key namespace) is the available
// alternative for this pass.
const NIS_LOOKUP_FAILURE_LOCKOUT = { limit: 3, windowMs: 60 * 60_000 };

export async function GET(request: NextRequest) {
  const nis = request.nextUrl.searchParams.get("nis");
  if (!nis) {
    return NextResponse.json({ error: "NIS diperlukan" }, { status: 400 });
  }

  const ip = getClientIp(request);
  const { ok, retryAfterSeconds } = rateLimit(`parent-lookup:${ip}`, LOOKUP_LIMIT);
  if (!ok) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi sebentar lagi." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  const nisLimitResult = rateLimit(`parent-lookup-nis:${nis}`, NIS_LOOKUP_LIMIT);
  if (!nisLimitResult.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi sebentar lagi." },
      { status: 429, headers: { "Retry-After": String(nisLimitResult.retryAfterSeconds) } },
    );
  }

  // Harsher tier: only failed lookups for this exact NIS count toward this
  // one (see NIS_LOOKUP_FAILURE_LOCKOUT above), so peek instead of consuming
  // an attempt here — a successful lookup below never touches this counter.
  const lockoutKey = `parent-lookup-nis-lockout:${nis}`;
  const lockoutCheck = peekRateLimit(lockoutKey, NIS_LOOKUP_FAILURE_LOCKOUT);
  if (!lockoutCheck.ok) {
    return NextResponse.json(
      {
        error:
          "NIS ini terkunci sementara karena terlalu banyak percobaan yang gagal. Coba lagi dalam beberapa saat.",
      },
      { status: 429, headers: { "Retry-After": String(lockoutCheck.retryAfterSeconds) } },
    );
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
    rateLimit(lockoutKey, NIS_LOOKUP_FAILURE_LOCKOUT);
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
    rateLimit(lockoutKey, NIS_LOOKUP_FAILURE_LOCKOUT);
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
    rateLimit(lockoutKey, NIS_LOOKUP_FAILURE_LOCKOUT);
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
