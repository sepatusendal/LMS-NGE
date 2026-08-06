import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface CurrentTeacher {
  teacherId: string;
  phone: string | null;
  fullName: string;
  email: string;
}

interface CurrentTeacherRow {
  id: string;
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
    .select("id, phone, users(fullName, email)")
    .eq("userId", user.id)
    .single();
  if (error) throw error;

  const row = data as unknown as CurrentTeacherRow;
  return {
    teacherId: row.id,
    phone: row.phone,
    fullName: row.users?.fullName ?? "-",
    email: row.users?.email ?? "-",
  };
}

export function useCurrentTeacher() {
  return useQuery({ queryKey: ["current-teacher"], queryFn: fetchCurrentTeacher });
}
