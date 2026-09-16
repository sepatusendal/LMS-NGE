-- students.nis had no uniqueness constraint at all — not even scoped to a
-- school. The public, unauthenticated portal at /api/parent-report/lookup
-- looks a student up by NIS alone and returns studentRows[0]: with two
-- students sharing an NIS (across different schools, or a data-entry
-- duplicate within one), a parent typing their own child's NIS could be
-- shown a different child's name, school, and downloadable report PDF.
-- Scope the constraint to (schoolId, nis) — NIS only needs to be unique
-- within a school in practice — and skip soft-deleted rows so a deleted
-- student's old NIS can be reissued. Verified against production data
-- first: 0 existing (schoolId, nis) collisions among active students, so
-- this is safe to add without a backfill/dedupe step.
CREATE UNIQUE INDEX "students_schoolId_nis_active_key"
  ON public.students ("schoolId", nis)
  WHERE "deletedAt" IS NULL AND nis IS NOT NULL;
