-- Rename Teacher.nip -> Teacher.tutorId: generic external tutor ID label
-- instead of the Indonesian-civil-servant-flavored "NIP" term. Not a
-- foreign key — just an identifier to disambiguate same-named tutors.
ALTER TABLE "teachers" RENAME COLUMN "nip" TO "tutorId";
ALTER INDEX "teachers_nip_key" RENAME TO "teachers_tutorId_key";
