import "server-only";
import { createClient } from "@supabase/supabase-js";

/// Service-role client — bypasses RLS entirely. Only ever import this from
/// server actions/route handlers that themselves verify the caller is an Admin.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
