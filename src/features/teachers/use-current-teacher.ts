import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface CurrentTeacher {
  teacherId: string;
  tutorId: string | null;
  phone: string | null;
  fullName: string;
  email: string;
}

interface CurrentTeacherRow {
  id: string;
  tutorId: string | null;
  phone: string | null;
  users: { fullName: string; email: string } | null;
}

async function fetchCurrentTeacher(): Promise<CurrentTeacher> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("teachers")
    .select("id, tutorId, phone, users(fullName, email)")
    .eq("userId", user.id)
    .single();
  if (error) throw error;

  const row = data as unknown as CurrentTeacherRow;
  return {
    teacherId: row.id,
    tutorId: row.tutorId,
    phone: row.phone,
    fullName: row.users?.fullName ?? "-",
    email: row.users?.email ?? "-",
  };
}

/** @param enabled Set to false when the caller already knows the current
 * user has no teacher profile (e.g. an admin filing a report on a tutor's
 * behalf) — skips a query that would otherwise 406 (no matching row) on
 * every render. Defaults to true for every teacher-facing caller. */
export function useCurrentTeacher(enabled = true) {
  return useQuery({ queryKey: ["current-teacher"], queryFn: fetchCurrentTeacher, enabled });
}
