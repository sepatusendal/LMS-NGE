-- Distinguish regular (K-12) students from teacher-training trainees, which
-- up to now shared the same "students" table with no discriminator beyond
-- which class they're enrolled in (see scripts/seed-teacher-training.ts,
-- which inserts trainees as plain Student rows with no nis). Without this,
-- any dashboard metric that counts/aggregates "students" risks inflating
-- real K-12 headcount with trainees. Mirrors the "classes"."classType"
-- enum/column added in 20260813030000_class_type.
CREATE TYPE "StudentType" AS ENUM ('REGULAR', 'TEACHER_TRAINING');
ALTER TABLE "students" ADD COLUMN "studentType" "StudentType" NOT NULL DEFAULT 'REGULAR';

-- Backfill: a student is a trainee if they are enrolled in any
-- TEACHER_TRAINING class. More reliable than matching on name, since
-- trainee rows have no other marker.
UPDATE "students"
SET "studentType" = 'TEACHER_TRAINING'
WHERE "id" IN (
  SELECT DISTINCT ce."studentId"
  FROM "class_enrollments" ce
  JOIN "classes" c ON c."id" = ce."classId"
  WHERE c."classType" = 'TEACHER_TRAINING'
);
