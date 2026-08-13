-- Add Teacher.nip (Nomor Induk Pegawai / employee ID), unique when set —
-- disambiguates tutors that share the same or a similar name, parallel to
-- Student.nis but enforced unique at the DB level.
ALTER TABLE "teachers" ADD COLUMN "nip" TEXT;
CREATE UNIQUE INDEX "teachers_nip_key" ON "teachers"("nip");
