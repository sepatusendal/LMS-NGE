-- Learning objectives were a single free-text field; teachers now fill a
-- numbered list (3 by default, can add more) — switch to TEXT[] like
-- questionsToAsk, preserving any existing text as a single first entry.
ALTER TABLE "lesson_plans" ADD COLUMN "learningObjectives_new" TEXT[] NOT NULL DEFAULT '{}';

UPDATE "lesson_plans"
SET "learningObjectives_new" = CASE
  WHEN "learningObjectives" IS NOT NULL AND trim("learningObjectives") != '' THEN ARRAY["learningObjectives"]
  ELSE '{}'::TEXT[]
END;

ALTER TABLE "lesson_plans" DROP COLUMN "learningObjectives";
ALTER TABLE "lesson_plans" RENAME COLUMN "learningObjectives_new" TO "learningObjectives";

-- Learning module (PDF) attached to the lesson plan — same Drive
-- file-id/filename pattern already used for check-in/check-out/report
-- photos (see check_ins.photoDriveFileId etc.).
ALTER TABLE "lesson_plans" ADD COLUMN "moduleDriveFileId" TEXT;
ALTER TABLE "lesson_plans" ADD COLUMN "moduleFileName" TEXT;
