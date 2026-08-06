-- Reference-data driven schema expansion:
-- - Student.nis (nomor induk siswa)
-- - Class.room + multi-day schedule (classes typically meet 2x/week)
-- - LessonPlan: full pedagogical content fields, authored by a Teacher
-- - TeachingReport: fields matching the current Daily Teaching Report form

-- ─── Student ───
ALTER TABLE "students" ADD COLUMN "nis" TEXT;

-- ─── Class: room + multi-day schedule ───
ALTER TABLE "classes" ADD COLUMN "room" TEXT;
ALTER TABLE "classes" ADD COLUMN "scheduleDaysOfWeek" INTEGER[] NOT NULL DEFAULT '{}';
UPDATE "classes" SET "scheduleDaysOfWeek" = ARRAY["scheduleDayOfWeek"] WHERE "scheduleDayOfWeek" IS NOT NULL;
ALTER TABLE "classes" ALTER COLUMN "scheduleDaysOfWeek" DROP DEFAULT;
ALTER TABLE "classes" DROP COLUMN "scheduleDayOfWeek";

-- ─── ObjectivesAchieved enum ───
CREATE TYPE "ObjectivesAchieved" AS ENUM ('YES', 'PARTIALLY', 'NO');

-- ─── LessonPlan: author + rich content fields ───
ALTER TABLE "lesson_plans" ADD COLUMN "createdByTeacherId" UUID;
UPDATE "lesson_plans" lp SET "createdByTeacherId" = c."teacherId" FROM "classes" c WHERE c.id = lp."classId";
ALTER TABLE "lesson_plans" ALTER COLUMN "createdByTeacherId" SET NOT NULL;
ALTER TABLE "lesson_plans" ADD CONSTRAINT "lesson_plans_createdByTeacherId_fkey" FOREIGN KEY ("createdByTeacherId") REFERENCES "teachers"("id");

ALTER TABLE "lesson_plans" DROP COLUMN "description";
ALTER TABLE "lesson_plans" ADD COLUMN "level" TEXT;
ALTER TABLE "lesson_plans" ADD COLUMN "learningObjectives" TEXT;
ALTER TABLE "lesson_plans" ADD COLUMN "skills" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "lesson_plans" ADD COLUMN "method" TEXT;
ALTER TABLE "lesson_plans" ADD COLUMN "procedure" TEXT;
ALTER TABLE "lesson_plans" ADD COLUMN "materialsRequired" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "lesson_plans" ADD COLUMN "vocabularyFocus" TEXT;
ALTER TABLE "lesson_plans" ADD COLUMN "stages" JSONB;
ALTER TABLE "lesson_plans" ADD COLUMN "questionsToAsk" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "lesson_plans" ADD COLUMN "differentiationSupport" TEXT;
ALTER TABLE "lesson_plans" ADD COLUMN "differentiationExtension" TEXT;
ALTER TABLE "lesson_plans" ADD COLUMN "differentiationHomework" TEXT;

-- ─── TeachingReport: fields matching the real Daily Teaching Report form ───
ALTER TABLE "teaching_reports" ALTER COLUMN "summary" DROP NOT NULL;
ALTER TABLE "teaching_reports" ADD COLUMN "skills" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "teaching_reports" ADD COLUMN "objectivesAchieved" "ObjectivesAchieved";
ALTER TABLE "teaching_reports" ADD COLUMN "whatWentWell" TEXT;
ALTER TABLE "teaching_reports" ADD COLUMN "whatNeedsImprovement" TEXT;
ALTER TABLE "teaching_reports" ADD COLUMN "nextLessonNotes" TEXT;
ALTER TABLE "teaching_reports" ADD COLUMN "photoDriveFileId" TEXT;
ALTER TABLE "teaching_reports" ADD COLUMN "photoFileName" TEXT;
