-- Optional substitute teacher on a per-date temporary schedule row (e.g.
-- exam-week hours where a class also gets covered by a different teacher
-- for that period). NULL means "same teacher as usual" — the existing
-- meaning of a temporary schedule row before this column existed.
ALTER TABLE "class_temporary_schedules" ADD COLUMN "teacherId" UUID;

ALTER TABLE "class_temporary_schedules" ADD CONSTRAINT "class_temporary_schedules_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "class_temporary_schedules_teacherId_idx" ON "class_temporary_schedules"("teacherId");
