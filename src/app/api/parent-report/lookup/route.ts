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

// Only failed lookups (identifier doesn't resolve to any student) count
// toward this lockout — 3 misses trips a full 1-hour lock on that
// identifier, regardless of IP. Deliberately does NOT count "student found
// but no report yet" as a failure (see below): that's an everyday state for
// a real parent checking back before the monthly report is generated, and
// punishing it locked out legitimate parents right when they most wanted to
// check. There's no CAPTCHA provider wired into this project, so this
// in-memory escalating lockout (via the same rate-limit utility, under its
// own key namespace) is the available alternative for this pass.
const NIS_LOOKUP_FAILURE_LOCKOUT = { limit: 3, windowMs: 60 * 60_000 };

// students.nis alone is not guaranteed unique across schools (only
// (schoolId, nis) is, as of 20260916050000) — a two-digit-different NIS
// collision between two schools would previously let one parent see another
// child's name/school/report via studentRows[0]. The public identifier is
// now "<nama sekolah>-<NIS>" so the lookup can resolve the right school
// first; matching is case/whitespace/punctuation-insensitive on the school
// name so parents don't need to type it byte-for-byte.
function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseIdentifier(raw: string): { schoolPart: string; nis: string } | null {
  const idx = raw.lastIndexOf("-");
  if (idx <= 0 || idx === raw.length - 1) return null;
  const schoolPart = raw.slice(0, idx).trim();
  const nis = raw.slice(idx + 1).trim();
  if (!schoolPart || !nis) return null;
  return { schoolPart, nis };
}

export async function GET(request: NextRequest) {
  const identifierRaw = request.nextUrl.searchParams.get("nis");
  if (!identifierRaw) {
    return NextResponse.json({ error: "NIS diperlukan" }, { status: 400 });
  }
  const parsed = parseIdentifier(identifierRaw);
  if (!parsed) {
    return NextResponse.json(
      { error: "Format salah. Masukkan sebagai \"Nama Sekolah-NIS\", contoh: SDN 1 Bogor-2024001." },
      { status: 400 },
    );
  }

  const ip = getClientIp(request);
  const { ok, retryAfterSeconds } = rateLimit(`parent-lookup:${ip}`, LOOKUP_LIMIT);
  if (!ok) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi sebentar lagi." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  // Normalized, not the raw identifier: the school part is matched
  // case/whitespace-insensitively below (normalizeForMatch), so keying the
  // rate limit on the raw text would let someone reset their own bucket
  // just by varying capitalization/spacing in the school name while
  // resolving to the exact same (school, nis) target every time.
  const identifierKey = `${normalizeForMatch(parsed.schoolPart)}:${parsed.nis}`;

  const nisLimitResult = rateLimit(`parent-lookup-nis:${identifierKey}`, NIS_LOOKUP_LIMIT);
  if (!nisLimitResult.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi sebentar lagi." },
      { status: 429, headers: { "Retry-After": String(nisLimitResult.retryAfterSeconds) } },
    );
  }

  // Harsher tier: only failed lookups for this exact identifier count toward
  // this one (see NIS_LOOKUP_FAILURE_LOCKOUT above), so peek instead of
  // consuming an attempt here — a successful lookup below never touches
  // this counter.
  const lockoutKey = `parent-lookup-nis-lockout:${identifierKey}`;
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

  const { data: schoolRows, error: schoolErr } = await supabase
    .from("schools")
    .select("id, name")
    .is("deletedAt", null);
  const matchingSchool = (schoolRows as { id: string; name: string }[] | null)?.find(
    (s) => normalizeForMatch(s.name) === normalizeForMatch(parsed.schoolPart),
  );

  if (schoolErr || !matchingSchool) {
    rateLimit(lockoutKey, NIS_LOOKUP_FAILURE_LOCKOUT);
    return NextResponse.json(
      { error: "NIS tidak ditemukan. Pastikan Nama Sekolah dan NIS yang dimasukkan benar." },
      { status: 404 },
    );
  }

  const { data: studentRows, error: studentErr } = await supabase
    .from("students")
    .select("id, fullName, schools(name)")
    .eq("schoolId", matchingSchool.id)
    .eq("nis", parsed.nis)
    .is("deletedAt", null);

  if (studentErr || !studentRows || studentRows.length === 0) {
    rateLimit(lockoutKey, NIS_LOOKUP_FAILURE_LOCKOUT);
    return NextResponse.json(
      { error: "NIS tidak ditemukan. Pastikan Nama Sekolah dan NIS yang dimasukkan benar." },
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
    // Not a lockout-eligible failure: the identifier resolved to a real
    // student, it just has no report yet — a routine state, not a wrong
    // guess. See NIS_LOOKUP_FAILURE_LOCKOUT above.
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
    // Same as above — student exists, report just isn't GENERATED yet.
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
