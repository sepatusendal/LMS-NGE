-- Enforce: no two classes in the same school can share a name.
-- If this fails with a uniqueness violation, rename the conflicting duplicate
-- classes first (query below finds them), then re-run the migration:
--   SELECT "schoolId", name, count(*) FROM classes GROUP BY "schoolId", name HAVING count(*) > 1;
ALTER TABLE "classes" ADD CONSTRAINT "classes_schoolId_name_key" UNIQUE ("schoolId", "name");
