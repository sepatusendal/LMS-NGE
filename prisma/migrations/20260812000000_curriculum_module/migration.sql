-- Adds a reference module (silabus/materi PDF, stored in Google Drive) per
-- curriculum/program, shown to teachers as a read-only reference when they
-- write a lesson plan for a class on that curriculum.
ALTER TABLE "curriculums"
  ADD COLUMN "moduleDriveFileId" TEXT,
  ADD COLUMN "moduleFileName" TEXT,
  ADD COLUMN "moduleFileSize" INTEGER,
  ADD COLUMN "moduleUpdatedAt" TIMESTAMPTZ(3);
