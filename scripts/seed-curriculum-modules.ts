/**
 * One-time setup for the "modul per kelas" feature:
 *   1. Ensures a Curriculum row exists for each program (Junior 1-4, Basic
 *      2-4).
 *   2. Assigns each of the 17 named classes to its program's curriculum.
 *   3. Uploads each program's module PDF (from "Modul Kelas Tutor/") to
 *      Google Drive and stores it on the curriculum row — no Basic 4 PDF
 *      exists yet in that folder, so Basic 4 is skipped (upload it later
 *      from the admin Kurikulum page).
 *
 * Runs against whatever NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY
 * are in --env (default .env, i.e. PRODUCTION) using the service role key,
 * which bypasses RLS — so this is a real, immediate write to real class
 * data. Defaults to a dry run that only prints what it would do; pass
 * --apply to actually write.
 *
 * Usage:
 *   npx tsx scripts/seed-curriculum-modules.ts              # dry run
 *   npx tsx scripts/seed-curriculum-modules.ts --apply       # writes for real
 *   npx tsx scripts/seed-curriculum-modules.ts --apply --env=.env.staging
 */
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const envArg = args.find((a) => a.startsWith("--env="));
const envPath = resolve(__dirname, "..", envArg ? envArg.split("=")[1] : ".env");

const env: Record<string, string> = {};
readFileSync(envPath, "utf-8")
  .split("\n")
  .forEach((line) => {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  });

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const MODULE_DIR = resolve(__dirname, "..", "Modul Kelas Tutor");

// Program name -> { gradeLevel label, module PDF filename (or null if none
// exists yet in the folder) }
const PROGRAMS: Record<string, { gradeLevel: string; file: string | null }> = {
  "Junior 1": { gradeLevel: "Junior 1", file: "Junior 1.pdf" },
  "Junior 2": { gradeLevel: "Junior 2", file: "Junior 2.pdf" },
  "Junior 3": { gradeLevel: "Junior 3", file: "Junior 3.pdf" },
  "Junior 4": { gradeLevel: "Junior 4", file: "Junior 4.pdf" },
  "Basic 2": { gradeLevel: "Basic 2", file: "Basic 2 (kelas 4-6).pdf" },
  "Basic 3": { gradeLevel: "Basic 3", file: "Basic 3 (kelas 4-6).pdf" },
  "Basic 4": { gradeLevel: "Basic 4", file: null },
};

// Exact class name (as given) -> program name. Typos in the source list
// ("Basicc 3", "Camberwelll") are normalized here on the program side only —
// the class name itself must match the DB exactly, so mismatches are
// reported rather than guessed at.
const CLASS_TO_PROGRAM: Record<string, string> = {
  Bolton: "Junior 4",
  Albury: "Junior 1",
  Aukland: "Junior 2",
  Aberdeen: "Junior 3",
  Boston: "Basic 4",
  Birmingham: "Basic 3",
  Belgrade: "Basic 3",
  Chicago: "Junior 1",
  Canterbury: "Junior 2",
  Camberwell: "Junior 2",
  Canberra: "Junior 3",
  Detroit: "Basic 3",
  Dallas: "Basic 2",
  Dublin: "Junior 4",
  georgetown: "Junior 1",
  Houstan: "Junior 2",
  "Las Vegas": "Basic 3",
};

let cachedToken: string | null = null;
function getAuth() {
  const client = new google.auth.OAuth2(
    env.GOOGLE_OAUTH_CLIENT_ID,
    env.GOOGLE_OAUTH_CLIENT_SECRET,
  );
  client.setCredentials({ refresh_token: env.GOOGLE_OAUTH_REFRESH_TOKEN });
  return client;
}
async function getAccessToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  const { token } = await getAuth().getAccessToken();
  if (!token) throw new Error("Failed to get Google access token");
  cachedToken = token;
  return token;
}

async function findOrCreateFolder(name: string, parentId: string): Promise<string> {
  const token = await getAccessToken();
  const escaped = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const query = `name = '${escaped}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)&pageSize=1`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const searchData = (await searchRes.json()) as { files?: { id: string }[] };
  if (searchData.files?.length) return searchData.files[0].id;

  const createRes = await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] }),
  });
  const created = (await createRes.json()) as { id: string };
  return created.id;
}

async function uploadModulePdf(filePath: string, fileName: string, folderId: string): Promise<string> {
  const token = await getAccessToken();
  const buffer = readFileSync(filePath);
  const metadata = { name: fileName, mimeType: "application/pdf", parents: [folderId] };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", new Blob([new Uint8Array(buffer)], { type: "application/pdf" }));

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err.error?.message ?? `Upload failed (${res.status})`);
  }
  const data = (await res.json()) as { id: string };

  await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });

  return data.id;
}

async function main() {
  console.log(`Env: ${envPath}`);
  console.log(`Mode: ${APPLY ? "APPLY (writing for real)" : "DRY RUN (no writes)"}`);
  console.log();

  // 1. Curriculums
  const { data: existingCurriculums, error: curErr } = await supabase
    .from("curriculums")
    .select("id, name")
    .is("deletedAt", null);
  if (curErr) throw curErr;

  const curriculumIdByName = new Map<string, string>();
  for (const row of existingCurriculums ?? []) {
    curriculumIdByName.set(row.name, row.id);
  }

  for (const [name, { gradeLevel }] of Object.entries(PROGRAMS)) {
    if (curriculumIdByName.has(name)) {
      console.log(`[curriculum] "${name}" already exists — skip`);
      continue;
    }
    console.log(`[curriculum] would create "${name}" (gradeLevel="${gradeLevel}")`);
    if (APPLY) {
      const { data, error } = await supabase
        .from("curriculums")
        .insert({ name, gradeLevel })
        .select("id")
        .single();
      if (error) throw error;
      curriculumIdByName.set(name, data.id);
      console.log(`  -> created ${data.id}`);
    }
  }
  console.log();

  // 2. Classes
  const { data: classes, error: classErr } = await supabase
    .from("classes")
    .select("id, name, curriculumId")
    .is("deletedAt", null);
  if (classErr) throw classErr;

  for (const [className, programName] of Object.entries(CLASS_TO_PROGRAM)) {
    const match = classes?.find((c) => c.name.trim().toLowerCase() === className.trim().toLowerCase());
    const targetCurriculumId = curriculumIdByName.get(programName);
    if (!match) {
      console.log(`[class] NOT FOUND in DB: "${className}" (expected -> ${programName}) — skipped`);
      continue;
    }
    if (!targetCurriculumId) {
      console.log(`[class] "${className}": program "${programName}" has no curriculum id yet — skipped`);
      continue;
    }
    if (match.curriculumId === targetCurriculumId) {
      console.log(`[class] "${className}" already assigned to "${programName}" — skip`);
      continue;
    }
    console.log(`[class] would set "${match.name}".curriculumId -> "${programName}"`);
    if (APPLY) {
      const { error } = await supabase
        .from("classes")
        .update({ curriculumId: targetCurriculumId })
        .eq("id", match.id);
      if (error) throw error;
    }
  }
  console.log();

  // 3. Module PDFs
  let modulesRootId: string | null = null;
  for (const [name, { file }] of Object.entries(PROGRAMS)) {
    if (!file) {
      console.log(`[module] "${name}": no PDF in "${MODULE_DIR}" — skip (upload later from admin UI)`);
      continue;
    }
    const filePath = resolve(MODULE_DIR, file);
    if (!existsSync(filePath)) {
      console.log(`[module] "${name}": expected file not found at ${filePath} — skip`);
      continue;
    }
    const curriculumId = curriculumIdByName.get(name);
    if (!curriculumId) {
      console.log(`[module] "${name}": no curriculum id yet — skip`);
      continue;
    }
    console.log(`[module] would upload "${file}" -> curriculum "${name}"`);
    if (APPLY) {
      if (!modulesRootId) {
        modulesRootId = await findOrCreateFolder("Modul Kelas", env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "root");
      }
      const folderId = await findOrCreateFolder(name, modulesRootId);
      console.log(`  uploading ${file}...`);
      const driveFileId = await uploadModulePdf(filePath, file, folderId);
      const { error } = await supabase
        .from("curriculums")
        .update({
          moduleDriveFileId: driveFileId,
          moduleFileName: file,
          moduleFileSize: readFileSync(filePath).length,
          moduleUpdatedAt: new Date().toISOString(),
        })
        .eq("id", curriculumId);
      if (error) throw error;
      console.log(`  -> uploaded, driveFileId=${driveFileId}`);
    }
  }

  console.log();
  console.log(APPLY ? "Done." : "Dry run complete — re-run with --apply to write.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
