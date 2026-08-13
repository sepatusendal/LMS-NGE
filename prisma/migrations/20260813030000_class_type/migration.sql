-- Distinguish regular (student) classes from teacher-training (Guru & Staff)
-- classes, which up to now shared the same "classes" table with no way to
-- tell them apart except by name prefix. Backfills the 11 "Guru & Staff -"
-- classes seeded by scripts/seed-teacher-training.ts.
CREATE TYPE "ClassType" AS ENUM ('REGULAR', 'TEACHER_TRAINING');
ALTER TABLE "classes" ADD COLUMN "classType" "ClassType" NOT NULL DEFAULT 'REGULAR';
UPDATE "classes" SET "classType" = 'TEACHER_TRAINING' WHERE "name" LIKE 'Guru & Staff -%';
