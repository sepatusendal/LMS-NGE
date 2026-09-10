-- Grade band on Class — a small fixed grouping (Kelas 1-3 / 4-6 / SMP&SMA)
-- used to batch-select classes for a temporary schedule (see below). Nullable:
-- existing classes are unset until an admin tags them.
CREATE TYPE "GradeBand" AS ENUM ('GRADE_1_3', 'GRADE_4_6', 'SMP_SMA');
ALTER TABLE "classes" ADD COLUMN "gradeBand" "GradeBand";

-- Temporary per-date schedule override (e.g. STS/exam-week hours) — one row
-- per class per date, so a date range is just N rows and the override
-- naturally stops applying once its dates pass.
CREATE TABLE "class_temporary_schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batchId" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "class_temporary_schedules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "class_temporary_schedules_classId_date_key" ON "class_temporary_schedules"("classId", "date");
CREATE INDEX "class_temporary_schedules_date_idx" ON "class_temporary_schedules"("date");
CREATE INDEX "class_temporary_schedules_batchId_idx" ON "class_temporary_schedules"("batchId");

ALTER TABLE "class_temporary_schedules" ADD CONSTRAINT "class_temporary_schedules_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
