-- Audit finding: several frequently-queried FK columns had no index,
-- forcing full-table scans on common "my classes / my history" lookups
-- and RLS policy checks. Table sizes here are small so this creates
-- near-instantly, no CONCURRENTLY needed.

CREATE INDEX IF NOT EXISTS "meetings_assignedTeacherId_idx" ON "meetings" ("assignedTeacherId");
CREATE INDEX IF NOT EXISTS "meetings_actualTeacherId_idx" ON "meetings" ("actualTeacherId");
CREATE INDEX IF NOT EXISTS "check_ins_teacherId_idx" ON "check_ins" ("teacherId");
CREATE INDEX IF NOT EXISTS "check_outs_teacherId_idx" ON "check_outs" ("teacherId");
CREATE INDEX IF NOT EXISTS "teaching_reports_originalTeacherId_idx" ON "teaching_reports" ("originalTeacherId");
CREATE INDEX IF NOT EXISTS "teaching_reports_substituteTeacherId_idx" ON "teaching_reports" ("substituteTeacherId");
CREATE INDEX IF NOT EXISTS "class_enrollments_classId_idx" ON "class_enrollments" ("classId");
CREATE INDEX IF NOT EXISTS "lesson_plans_createdByTeacherId_idx" ON "lesson_plans" ("createdByTeacherId");
