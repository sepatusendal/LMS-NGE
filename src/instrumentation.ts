// Vercel reserves the `TZ` environment variable name — it can't be set via
// the dashboard or `vercel env add` (confirmed 2026-09-05: the API rejects
// it as "reserved"). Serverless functions there default to UTC otherwise,
// which silently shifts every "today"/lateness/holiday calculation in
// src/lib/date.ts by up to 7 hours around midnight WIB. Setting it here,
// in Next.js's instrumentation hook, runs once when the server process
// starts — before any request handling — which is early enough for every
// subsequent `new Date()` / Intl call in the app to see it.
export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.env.TZ = "Asia/Jakarta";
    console.log(`[instrumentation] TZ set to ${process.env.TZ} — server "now" resolves as ${new Date().toString()}`);
  }
}
