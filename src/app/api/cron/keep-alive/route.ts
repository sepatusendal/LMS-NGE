import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Supabase's free tier pauses a project after 7 days with no API activity —
 * this has already knocked production offline once (project lpmpypxaikapttrcopoj,
 * 2026-08-26). Vercel Cron hits this route daily to generate real API traffic
 * so the project never reaches that threshold. Hobby plan crons run at most
 * once a day, which is a wide enough margin under the 7-day window. */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("schools").select("id").limit(1);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, pingedAt: new Date().toISOString() });
}
