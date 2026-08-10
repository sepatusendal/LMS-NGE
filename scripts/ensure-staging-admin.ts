import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(__dirname, "../.env.staging");
const env: Record<string, string> = {};
readFileSync(envPath, "utf-8")
  .split("\n")
  .forEach((line) => {
    const [key, ...vals] = line.split("=");
    if (key && vals.length) env[key.trim()] = vals.join("=").trim().replace(/^["']|["']$/g, "");
  });

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const email = "admin.seed@nufaglobal.id";
  const password = "password123";
  const { data: existing } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  let userId = existing?.users.find((u) => u.email === email)?.id;
  if (!userId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { fullName: "Admin Seed" },
    });
    if (error) throw error;
    userId = data.user!.id;
  }
  await supabase.from("users").upsert(
    { id: userId, email, fullName: "Admin Seed", role: "ADMIN" },
    { onConflict: "id" },
  );
  console.log(`Admin ready: ${email} / ${password}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
