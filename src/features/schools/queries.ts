import { createClient } from "@/lib/supabase/client";
import type { School, SchoolInput } from "./schema";

export async function fetchSchools(): Promise<School[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("schools")
    .select("id, name, address, picName, picPhone, isActive, createdAt")
    .is("deletedAt", null)
    .order("name");
  if (error) throw error;
  return data;
}

export async function createSchool(input: SchoolInput) {
  const supabase = createClient();
  const { error } = await supabase.from("schools").insert(input);
  if (error) throw error;
}

export async function updateSchool(id: string, input: SchoolInput) {
  const supabase = createClient();
  const { error } = await supabase.from("schools").update(input).eq("id", id);
  if (error) throw error;
}

export async function setSchoolActive(id: string, isActive: boolean) {
  const supabase = createClient();
  const { error } = await supabase
    .from("schools")
    .update({ isActive })
    .eq("id", id);
  if (error) throw error;
}
