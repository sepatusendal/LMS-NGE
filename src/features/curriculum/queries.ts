import { createClient } from "@/lib/supabase/client";
import type { Curriculum, CurriculumInput } from "./schema";

export async function fetchCurriculums(): Promise<Curriculum[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("curriculums")
    .select(
      "id, name, gradeLevel, description, isActive, createdAt, moduleDriveFileId, moduleFileName, moduleFileSize, moduleUpdatedAt, reportFormat",
    )
    .is("deletedAt", null)
    .order("gradeLevel");
  if (error) throw error;
  return data as unknown as Curriculum[];
}

export async function createCurriculum(input: CurriculumInput) {
  const supabase = createClient();
  const { error } = await supabase.from("curriculums").insert(input);
  if (error) throw error;
}

export async function updateCurriculum(id: string, input: CurriculumInput) {
  const supabase = createClient();
  const { error } = await supabase
    .from("curriculums")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function setCurriculumActive(id: string, isActive: boolean) {
  const supabase = createClient();
  const { error } = await supabase
    .from("curriculums")
    .update({ isActive })
    .eq("id", id);
  if (error) throw error;
}
