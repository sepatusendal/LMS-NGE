-- Lets the admin choose who has to receive a policy packet: whole roles,
-- specific people, or both, minus exclusions (an exclusion always wins). Until
-- now every packet went to all tutors, and existing packets keep exactly that.
--
-- The audience lives in its own admin-only table so a recipient can never read
-- who else was included or left out. It is written only through
-- set_policy_audience, which also logs changes made after publishing.

CREATE TABLE "policy_audiences" (
    "packetId" UUID NOT NULL,
    "roles" "Role"[] NOT NULL DEFAULT ARRAY[]::"Role"[],
    "includedUserIds" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    "excludedUserIds" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    "updatedByUserId" UUID,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_audiences_pkey" PRIMARY KEY ("packetId")
);

ALTER TABLE "policy_audiences"
  ADD CONSTRAINT "policy_audiences_packetId_fkey"
  FOREIGN KEY ("packetId") REFERENCES "policy_packets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "policy_audience_changes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "packetId" UUID NOT NULL,
    -- Kept as plain values so the history survives account changes.
    "changedByUserId" UUID,
    "changedByName" TEXT,
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    "changedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_audience_changes_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "policy_audience_changes"
  ADD CONSTRAINT "policy_audience_changes_packetId_fkey"
  FOREIGN KEY ("packetId") REFERENCES "policy_packets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "policy_audience_changes_packetId_idx" ON "policy_audience_changes"("packetId");

INSERT INTO "policy_audiences" ("packetId", "roles")
SELECT "id", ARRAY['TEACHER']::"Role"[] FROM "policy_packets";

-- Every confirmation made before this change was a tutor's, and the default
-- fills those rows (adding a column fires no row trigger). It stays so that a
-- tutor-only build still running while this is rolled out keeps working.
ALTER TABLE "policy_acknowledgements" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'TEACHER';

-- ── Who is a recipient ───────────────────────────────────────────────────

-- The one definition of "has to receive this". Inactive accounts, and tutors
-- without an active teacher profile, are never recipients. Internal only: it
-- would otherwise let anyone ask about any other user.
CREATE FUNCTION public.policy_user_is_recipient(p_packet_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.policy_audiences a
    JOIN public.users u ON u.id = p_user_id
    WHERE a."packetId" = p_packet_id
      AND u."isActive" AND u."deletedAt" IS NULL
      AND (
        u.role <> 'TEACHER'
        OR EXISTS (
          SELECT 1 FROM public.teachers t
          WHERE t."userId" = u.id AND t."isActive" AND t."deletedAt" IS NULL
        )
      )
      AND NOT (u.id = ANY (a."excludedUserIds"))
      AND (u.role = ANY (a."roles") OR u.id = ANY (a."includedUserIds"))
  );
$$;

CREATE FUNCTION public.policy_packet_targets_me(p_packet_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.policy_user_is_recipient(p_packet_id, auth.uid());
$$;

-- The packets that belong on the caller's own documents page. Needed because
-- row level security lets an admin read every packet, targeted or not.
CREATE FUNCTION public.my_policy_packet_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id
  FROM public.policy_packets p
  WHERE (p.status = 'PUBLISHED' AND public.policy_packet_targets_me(p.id))
     OR (
       p.status IN ('PUBLISHED', 'ARCHIVED')
       AND EXISTS (
         SELECT 1 FROM public.policy_acknowledgements a
         WHERE a."packetId" = p.id AND a."userId" = auth.uid()
       )
     );
$$;

-- ── Admin reporting ──────────────────────────────────────────────────────

CREATE FUNCTION public.policy_packet_recipients(p_packet_id UUID)
RETURNS TABLE ("userId" UUID, "fullName" TEXT, "email" TEXT, "role" "Role", "tutorId" TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT COALESCE(public.is_admin(), FALSE) THEN
    RAISE EXCEPTION 'Only an admin can list recipients' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT u.id, u."fullName", u.email, u.role,
         CASE WHEN u.role = 'TEACHER' THEN t."tutorId" END
  FROM public.users u
  LEFT JOIN public.teachers t ON t."userId" = u.id
  WHERE public.policy_user_is_recipient(p_packet_id, u.id)
  ORDER BY u.id;
END;
$$;

-- Per packet: how many people are expected, and how many of them confirmed.
CREATE FUNCTION public.policy_packet_summaries()
RETURNS TABLE ("packetId" UUID, "recipients" INTEGER, "confirmed" INTEGER)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT COALESCE(public.is_admin(), FALSE) THEN
    RAISE EXCEPTION 'Only an admin can read summaries' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT p.id, COUNT(r.id)::INTEGER, COUNT(a.id)::INTEGER
  FROM public.policy_packets p
  LEFT JOIN LATERAL (
    SELECT u.id FROM public.users u WHERE public.policy_user_is_recipient(p.id, u.id)
  ) r ON TRUE
  LEFT JOIN public.policy_acknowledgements a ON a."packetId" = p.id AND a."userId" = r.id
  GROUP BY p.id;
END;
$$;

-- The only way to write an audience.
CREATE FUNCTION public.set_policy_audience(
  p_packet_id UUID,
  p_roles "Role"[],
  p_included UUID[],
  p_excluded UUID[]
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  packet_status "PolicyPacketStatus";
  previous public.policy_audiences%ROWTYPE;
  new_roles "Role"[];
  new_included UUID[];
  new_excluded UUID[];
BEGIN
  IF NOT COALESCE(public.is_admin(), FALSE) THEN
    RAISE EXCEPTION 'Only an admin can choose recipients' USING ERRCODE = '42501';
  END IF;

  SELECT status INTO packet_status FROM public.policy_packets WHERE id = p_packet_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Policy packet not found';
  END IF;
  IF packet_status = 'ARCHIVED' THEN
    RAISE EXCEPTION 'Recipients of a retired packet cannot be changed';
  END IF;

  -- Sorted and without duplicates, so "nothing changed" is a plain comparison.
  new_roles := ARRAY(SELECT DISTINCT x FROM unnest(p_roles) x WHERE x IS NOT NULL ORDER BY x);
  new_included := ARRAY(SELECT DISTINCT x FROM unnest(p_included) x WHERE x IS NOT NULL ORDER BY x);
  new_excluded := ARRAY(SELECT DISTINCT x FROM unnest(p_excluded) x WHERE x IS NOT NULL ORDER BY x);

  IF cardinality(new_included) > 1000 OR cardinality(new_excluded) > 1000 THEN
    RAISE EXCEPTION 'Too many people selected';
  END IF;
  -- Nothing selected must never be read as "everyone".
  IF packet_status = 'PUBLISHED' AND cardinality(new_roles) = 0 AND cardinality(new_included) = 0 THEN
    RAISE EXCEPTION 'Choose who has to receive this';
  END IF;

  SELECT * INTO previous FROM public.policy_audiences WHERE "packetId" = p_packet_id;
  IF FOUND AND previous."roles" = new_roles
     AND previous."includedUserIds" = new_included
     AND previous."excludedUserIds" = new_excluded THEN
    RETURN;
  END IF;

  INSERT INTO public.policy_audiences
    ("packetId", "roles", "includedUserIds", "excludedUserIds", "updatedByUserId", "updatedAt")
  VALUES (p_packet_id, new_roles, new_included, new_excluded, auth.uid(), CURRENT_TIMESTAMP)
  ON CONFLICT ("packetId") DO UPDATE SET
    "roles" = EXCLUDED."roles",
    "includedUserIds" = EXCLUDED."includedUserIds",
    "excludedUserIds" = EXCLUDED."excludedUserIds",
    "updatedByUserId" = EXCLUDED."updatedByUserId",
    "updatedAt" = EXCLUDED."updatedAt";

  IF packet_status = 'PUBLISHED' THEN
    INSERT INTO public.policy_audience_changes
      ("packetId", "changedByUserId", "changedByName", "before", "after")
    VALUES (
      p_packet_id,
      auth.uid(),
      (SELECT "fullName" FROM public.users WHERE id = auth.uid()),
      jsonb_build_object(
        'roles', COALESCE(to_jsonb(previous."roles"), '[]'::jsonb),
        'includedUserIds', COALESCE(to_jsonb(previous."includedUserIds"), '[]'::jsonb),
        'excludedUserIds', COALESCE(to_jsonb(previous."excludedUserIds"), '[]'::jsonb)
      ),
      jsonb_build_object(
        'roles', to_jsonb(new_roles),
        'includedUserIds', to_jsonb(new_included),
        'excludedUserIds', to_jsonb(new_excluded)
      )
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.policy_user_is_recipient(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.policy_packet_targets_me(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.policy_packet_targets_me(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.my_policy_packet_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_policy_packet_ids() TO authenticated;
REVOKE ALL ON FUNCTION public.policy_packet_recipients(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.policy_packet_recipients(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.policy_packet_summaries() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.policy_packet_summaries() TO authenticated;
REVOKE ALL ON FUNCTION public.set_policy_audience(UUID, "Role"[], UUID[], UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_policy_audience(UUID, "Role"[], UUID[], UUID[]) TO authenticated;

-- ── Row level security ───────────────────────────────────────────────────

ALTER TABLE public.policy_audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_audience_changes ENABLE ROW LEVEL SECURITY;

-- Read only, admins only. Writes go through set_policy_audience.
CREATE POLICY "admin_read_policy_audiences" ON public.policy_audiences FOR SELECT
  USING (public.is_admin());
CREATE POLICY "admin_read_policy_audience_changes" ON public.policy_audience_changes FOR SELECT
  USING (public.is_admin());
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.policy_audiences FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.policy_audience_changes FROM anon, authenticated;

-- Recipients replace the old "every tutor" rules. Anyone who confirmed keeps
-- access, even after being taken off the list.
DROP POLICY "tutor_read_policy_packets" ON public.policy_packets;
CREATE POLICY "recipient_read_policy_packets" ON public.policy_packets FOR SELECT TO authenticated
  USING (
    (status = 'PUBLISHED' AND public.policy_packet_targets_me(id))
    OR (
      status IN ('PUBLISHED', 'ARCHIVED')
      AND EXISTS (
        SELECT 1 FROM public.policy_acknowledgements a
        WHERE a."packetId" = policy_packets.id AND a."userId" = auth.uid()
      )
    )
  );

DROP POLICY "tutor_read_policy_documents" ON public.policy_documents;
-- The subquery runs under the caller's own policies on policy_packets.
CREATE POLICY "recipient_read_policy_documents" ON public.policy_documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.policy_packets p WHERE p.id = policy_documents."packetId"));

DROP POLICY "self_insert_policy_read_progress" ON public.policy_read_progress;
CREATE POLICY "self_insert_policy_read_progress" ON public.policy_read_progress FOR INSERT
  WITH CHECK (
    "userId" = auth.uid()
    AND EXISTS (SELECT 1 FROM public.policy_documents d WHERE d.id = policy_read_progress."documentId")
  );

-- ── Existing rules, now audience aware ───────────────────────────────────

-- Same guard as before, plus: a packet cannot be published without recipients.
CREATE OR REPLACE FUNCTION public.guard_policy_packet()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'DRAFT' THEN
      RAISE EXCEPTION 'A new policy packet starts as a draft';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'DRAFT' THEN
      RAISE EXCEPTION 'Only a draft policy packet can be deleted';
    END IF;
    RETURN OLD;
  END IF;

  NEW."updatedAt" := CURRENT_TIMESTAMP;

  IF OLD.status = 'DRAFT' THEN
    IF NEW.status = 'ARCHIVED' THEN
      RAISE EXCEPTION 'A draft cannot be archived';
    END IF;
    IF NEW.status = 'PUBLISHED' THEN
      IF cardinality(NEW."checklistItems") = 0 THEN
        RAISE EXCEPTION 'Add at least one checklist item before publishing';
      END IF;
      IF btrim(NEW.statement) = '' THEN
        RAISE EXCEPTION 'Fill in the statement before publishing';
      END IF;
      IF NEW."driveReceiptsFolderId" IS NULL
         OR NOT EXISTS (SELECT 1 FROM public.policy_documents d WHERE d."packetId" = NEW.id) THEN
        RAISE EXCEPTION 'Upload at least one document before publishing';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM public.policy_audiences a
        WHERE a."packetId" = NEW.id
          AND (cardinality(a."roles") > 0 OR cardinality(a."includedUserIds") > 0)
      ) THEN
        RAISE EXCEPTION 'Choose who has to receive this before publishing';
      END IF;
      NEW."publishedAt" := COALESCE(NEW."publishedAt", CURRENT_TIMESTAMP);
    END IF;
    RETURN NEW;
  END IF;

  -- Published or archived: everything a recipient acknowledged is frozen.
  IF (NEW.id, NEW.title, NEW.version, NEW."checklistItems", NEW.statement, NEW."replacesPacketId",
      NEW."driveFolderId", NEW."driveDocumentsFolderId", NEW."driveReceiptsFolderId",
      NEW."createdByUserId", NEW."publishedAt", NEW."createdAt")
     IS DISTINCT FROM
     (OLD.id, OLD.title, OLD.version, OLD."checklistItems", OLD.statement, OLD."replacesPacketId",
      OLD."driveFolderId", OLD."driveDocumentsFolderId", OLD."driveReceiptsFolderId",
      OLD."createdByUserId", OLD."publishedAt", OLD."createdAt") THEN
    RAISE EXCEPTION 'A published policy packet cannot be edited; create a new version';
  END IF;

  IF NEW.status <> OLD.status THEN
    IF NOT (OLD.status = 'PUBLISHED' AND NEW.status = 'ARCHIVED') THEN
      RAISE EXCEPTION 'A published policy packet can only be archived';
    END IF;
    NEW."archivedAt" := CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$;

-- A new version starts with the same wording and the same recipients.
CREATE OR REPLACE FUNCTION public.create_policy_packet_version(p_packet_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  source public.policy_packets%ROWTYPE;
  draft_id UUID;
BEGIN
  IF NOT COALESCE(public.is_admin(), FALSE) THEN
    RAISE EXCEPTION 'Only an admin can create a version' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO source FROM public.policy_packets WHERE id = p_packet_id FOR UPDATE;
  IF NOT FOUND OR source.status = 'DRAFT' THEN
    RAISE EXCEPTION 'A new version starts from a published packet';
  END IF;

  SELECT id INTO draft_id FROM public.policy_packets
  WHERE "replacesPacketId" = p_packet_id AND status = 'DRAFT'
  LIMIT 1;
  IF draft_id IS NOT NULL THEN
    RETURN draft_id;
  END IF;

  INSERT INTO public.policy_packets (
    title, version, "checklistItems", statement,
    "hrContactName", "hrWhatsapp", "hrEmail", "noticeTitle", "noticeMessage",
    "replacesPacketId", "createdByUserId"
  )
  VALUES (
    source.title, source.version + 1, source."checklistItems", source.statement,
    source."hrContactName", source."hrWhatsapp", source."hrEmail", source."noticeTitle", source."noticeMessage",
    source.id, auth.uid()
  )
  RETURNING id INTO draft_id;

  INSERT INTO public.policy_audiences ("packetId", "roles", "includedUserIds", "excludedUserIds", "updatedByUserId")
  SELECT draft_id, a."roles", a."includedUserIds", a."excludedUserIds", auth.uid()
  FROM public.policy_audiences a
  WHERE a."packetId" = p_packet_id;

  RETURN draft_id;
END;
$$;
