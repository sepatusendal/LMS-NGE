// One-off: backfill teaching_reports.substituteTeacherId / replacementReason
// for reports filed by an admin (Kelola Meeting) on a meeting that already had
// a substitute tutor. Before the fix in "laporan yang dibuat admin dicatat atas
// nama tutor yang benar-benar mengajar", the admin dialog sent the *scheduled*
// tutor, so create_teaching_report() stored no substitute on those reports.
//
// A report is touched only when ALL of these hold:
//   - its meeting has a substitute (actualTeacherId set and != assignedTeacherId)
//   - the report's substituteTeacherId is still NULL
// The value written is the meeting's own actualTeacherId / substituteReason —
// the same source every report/analytics view already displays, so nothing
// visible changes; the report row just stops contradicting its meeting.
// Reports that already carry a *different* substitute are only reported, never
// overwritten. Safe to re-run.
//
// Dry run by default. Run with:
//   npx tsx scripts/backfill-report-substitute.ts dev            # preview
//   npx tsx scripts/backfill-report-substitute.ts dev --apply    # write
//   npx tsx scripts/backfill-report-substitute.ts prod
//   npx tsx scripts/backfill-report-substitute.ts prod --apply

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

type ToOne<T> = T | T[] | null;

interface MeetingRow {
  id: string;
  assignedTeacherId: string;
  actualTeacherId: string | null;
  substituteReason: string | null;
  actualTeacher: ToOne<{ users: ToOne<{ fullName: string }> }>;
  teachingReport: ToOne<{ id: string; substituteTeacherId: string | null }>;
}

interface Fix {
  reportId: string;
  meetingId: string;
  substituteTeacherId: string;
  substituteName: string;
  reason: string | null;
}

function toOne<T>(rel: ToOne<T> | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

/** Pure decision logic — which reports need a substitute written, and which
 * already disagree with their meeting and must be left for a human. */
export function planBackfill(meetings: MeetingRow[]): { fixes: Fix[]; conflicts: string[] } {
  const fixes: Fix[] = [];
  const conflicts: string[] = [];

  for (const m of meetings) {
    if (!m.actualTeacherId || m.actualTeacherId === m.assignedTeacherId) continue;
    const report = toOne(m.teachingReport);
    if (!report) continue;

    if (report.substituteTeacherId === null) {
      fixes.push({
        reportId: report.id,
        meetingId: m.id,
        substituteTeacherId: m.actualTeacherId,
        substituteName: toOne(toOne(m.actualTeacher)?.users)?.fullName ?? "-",
        reason: m.substituteReason,
      });
    } else if (report.substituteTeacherId !== m.actualTeacherId) {
      conflicts.push(report.id);
    }
  }

  return { fixes, conflicts };
}

async function main() {
  const target = process.argv[2];
  if (target !== "dev" && target !== "prod") {
    throw new Error("Usage: npx tsx scripts/backfill-report-substitute.ts <dev|prod> [--apply]");
  }
  const apply = process.argv.includes("--apply");
  const envFile = target === "prod" ? "../.env" : "../.env.staging";

  const envContent = readFileSync(resolve(__dirname, envFile), "utf-8");
  const env: Record<string, string> = {};
  envContent.split("\n").forEach((line) => {
    const [key, ...vals] = line.split("=");
    if (key && vals.length) env[key.trim()] = vals.join("=").trim().replace(/^["']|["']$/g, "");
  });

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error(`Missing env vars in ${envFile}`);

  console.log(`Target: ${target.toUpperCase()} — ${supabaseUrl}`);
  console.log(apply ? "Mode: APPLY (writes)\n" : "Mode: dry run (no writes) — add --apply to write\n");

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // PostgREST caps a response at 1000 rows by default — page through.
  const PAGE = 1000;
  const meetings: MeetingRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("meetings")
      .select(
        "id, assignedTeacherId, actualTeacherId, substituteReason, actualTeacher:teachers!meetings_actualTeacherId_fkey(users(fullName)), teachingReport:teaching_reports(id, substituteTeacherId)",
      )
      .not("actualTeacherId", "is", null)
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    meetings.push(...(data as unknown as MeetingRow[]));
    if (!data || data.length < PAGE) break;
  }

  const { fixes, conflicts } = planBackfill(meetings);
  console.log(`Meetings with an actual teacher: ${meetings.length}`);
  console.log(`Reports to backfill:             ${fixes.length}`);
  console.log(`Reports with a different substitute (left untouched): ${conflicts.length}`);
  conflicts.forEach((id) => console.log(`  conflict: report ${id}`));
  console.log();

  let done = 0;
  for (const f of fixes) {
    const line = `report ${f.reportId} -> ${f.substituteName}${f.reason ? ` (${f.reason})` : ""}`;
    if (!apply) {
      console.log(`would set  ${line}`);
      continue;
    }
    // .is(..., null) makes each write a no-op if something filled the column
    // since we read it, so a concurrent edit is never overwritten.
    const { data, error } = await supabase
      .from("teaching_reports")
      .update({ substituteTeacherId: f.substituteTeacherId, replacementReason: f.reason })
      .eq("id", f.reportId)
      .is("substituteTeacherId", null)
      .select("id");
    if (error) throw error;
    if (data && data.length > 0) {
      done++;
      console.log(`updated    ${line}`);
    } else {
      console.log(`skipped    ${line} (already changed)`);
    }
  }

  console.log(apply ? `\nDone: ${done}/${fixes.length} reports updated.` : "\nDry run finished — nothing written.");
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
