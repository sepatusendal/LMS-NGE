-- Company policy documents that every active tutor has to read, sign and
-- acknowledge. Files (the policy PDFs and each tutor's signed receipt) live in
-- Google Drive; these tables only hold Drive ids, hashes and short text. The
-- signature is drawn into the receipt PDF and is never stored here.
--
-- Rules enforced in the database, not only in the UI:
--   * a published packet and its documents are frozen (deadline and HR contact
--     stay editable; the only status change left is PUBLISHED -> ARCHIVED);
--   * acknowledgements are written by the server only (service role) and can
--     never be updated, deleted or truncated.

CREATE TYPE "PolicyPacketStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "policy_packets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "PolicyPacketStatus" NOT NULL DEFAULT 'DRAFT',
    "checklistItems" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "statement" TEXT NOT NULL,
    "deadline" DATE,
    "hrContactName" TEXT,
    "hrWhatsapp" TEXT,
    "hrEmail" TEXT,
    "replacesPacketId" UUID,
    "driveFolderId" TEXT,
    "driveDocumentsFolderId" TEXT,
    "driveReceiptsFolderId" TEXT,
    "createdByUserId" UUID NOT NULL,
    "publishedAt" TIMESTAMPTZ(3),
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_packets_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "policy_packets"
  ADD CONSTRAINT "policy_packets_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "policy_packets"
  ADD CONSTRAINT "policy_packets_replacesPacketId_fkey"
  FOREIGN KEY ("replacesPacketId") REFERENCES "policy_packets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "policy_packets_status_idx" ON "policy_packets"("status");

CREATE TABLE "policy_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "packetId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "documentNumber" TEXT,
    "versionLabel" TEXT,
    "effectiveDate" DATE,
    "driveFileId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_documents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "policy_documents_pageCount_check" CHECK ("pageCount" > 0)
);

ALTER TABLE "policy_documents"
  ADD CONSTRAINT "policy_documents_packetId_fkey"
  FOREIGN KEY ("packetId") REFERENCES "policy_packets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "policy_documents_packetId_idx" ON "policy_documents"("packetId");

-- One row per tutor per document, updated in place (not an event log).
CREATE TABLE "policy_read_progress" (
    "userId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "furthestPage" INTEGER NOT NULL DEFAULT 0,
    "firstOpenedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_read_progress_pkey" PRIMARY KEY ("userId", "documentId")
);

ALTER TABLE "policy_read_progress"
  ADD CONSTRAINT "policy_read_progress_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "policy_read_progress"
  ADD CONSTRAINT "policy_read_progress_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "policy_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "policy_read_progress_documentId_idx" ON "policy_read_progress"("documentId");

CREATE TABLE "policy_acknowledgements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "packetId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    -- Who confirmed, as they were at that moment.
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tutorId" TEXT,
    "userAgent" TEXT,
    "receiptDriveFileId" TEXT NOT NULL,
    "receiptFileName" TEXT NOT NULL,
    "receiptSha256" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_acknowledgements_pkey" PRIMARY KEY ("id")
);

-- RESTRICT: neither the packet nor the account can be removed once evidence
-- points at it.
ALTER TABLE "policy_acknowledgements"
  ADD CONSTRAINT "policy_acknowledgements_packetId_fkey"
  FOREIGN KEY ("packetId") REFERENCES "policy_packets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "policy_acknowledgements"
  ADD CONSTRAINT "policy_acknowledgements_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "policy_acknowledgements_packetId_userId_key"
  ON "policy_acknowledgements"("packetId", "userId");
CREATE UNIQUE INDEX "policy_acknowledgements_receiptNumber_key"
  ON "policy_acknowledgements"("receiptNumber");
CREATE INDEX "policy_acknowledgements_userId_idx" ON "policy_acknowledgements"("userId");

-- ── Guards ───────────────────────────────────────────────────────────────

CREATE FUNCTION public.forbid_policy_acknowledgement_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Policy acknowledgements are permanent' USING ERRCODE = '42501';
END;
$$;

CREATE TRIGGER policy_acknowledgements_permanent
  BEFORE UPDATE OR DELETE ON public.policy_acknowledgements
  FOR EACH ROW EXECUTE FUNCTION public.forbid_policy_acknowledgement_change();
CREATE TRIGGER policy_acknowledgements_no_truncate
  BEFORE TRUNCATE ON public.policy_acknowledgements
  FOR EACH STATEMENT EXECUTE FUNCTION public.forbid_policy_acknowledgement_change();

CREATE FUNCTION public.guard_policy_packet()
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
      NEW."publishedAt" := COALESCE(NEW."publishedAt", CURRENT_TIMESTAMP);
    END IF;
    RETURN NEW;
  END IF;

  -- Published or archived: everything a tutor acknowledged is frozen.
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

CREATE TRIGGER policy_packets_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.policy_packets
  FOR EACH ROW EXECUTE FUNCTION public.guard_policy_packet();

CREATE FUNCTION public.guard_policy_document()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  parent_status "PolicyPacketStatus";
BEGIN
  -- FOR SHARE blocks a concurrent publish while a document is being changed.
  IF TG_OP <> 'INSERT' THEN
    SELECT status INTO parent_status FROM public.policy_packets WHERE id = OLD."packetId" FOR SHARE;
    -- Not found only while a draft packet delete cascades into its documents.
    IF FOUND AND parent_status <> 'DRAFT' THEN
      RAISE EXCEPTION 'Documents of a published policy packet cannot be changed';
    END IF;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    SELECT status INTO parent_status FROM public.policy_packets WHERE id = NEW."packetId" FOR SHARE;
    IF NOT FOUND OR parent_status <> 'DRAFT' THEN
      RAISE EXCEPTION 'Documents of a published policy packet cannot be changed';
    END IF;
    RETURN NEW;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER policy_documents_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.policy_documents
  FOR EACH ROW EXECUTE FUNCTION public.guard_policy_document();

-- The client only reports how far it got. The server keeps the furthest page
-- and decides when a document counts as completed.
CREATE FUNCTION public.apply_policy_read_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  total INTEGER;
BEGIN
  SELECT "pageCount" INTO total FROM public.policy_documents WHERE id = NEW."documentId";

  IF TG_OP = 'UPDATE' THEN
    IF NEW."userId" <> OLD."userId" OR NEW."documentId" <> OLD."documentId" THEN
      RAISE EXCEPTION 'Reading progress cannot be moved';
    END IF;
    NEW."furthestPage" := GREATEST(NEW."furthestPage", OLD."furthestPage");
    NEW."firstOpenedAt" := OLD."firstOpenedAt";
    NEW."completedAt" := OLD."completedAt";
  ELSE
    NEW."firstOpenedAt" := CURRENT_TIMESTAMP;
    NEW."completedAt" := NULL;
  END IF;

  NEW."furthestPage" := LEAST(GREATEST(NEW."furthestPage", 0), COALESCE(total, 0));
  IF NEW."completedAt" IS NULL AND total IS NOT NULL AND NEW."furthestPage" >= total THEN
    NEW."completedAt" := CURRENT_TIMESTAMP;
  END IF;
  NEW."updatedAt" := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER policy_read_progress_apply
  BEFORE INSERT OR UPDATE ON public.policy_read_progress
  FOR EACH ROW EXECUTE FUNCTION public.apply_policy_read_progress();

-- ── Row level security ───────────────────────────────────────────────────

ALTER TABLE public.policy_packets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_read_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_acknowledgements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_policy_packets" ON public.policy_packets FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
-- Tutors see published packets, plus retired ones they had acknowledged.
CREATE POLICY "tutor_read_policy_packets" ON public.policy_packets FOR SELECT
  USING (
    public.current_user_role() = 'TEACHER'
    AND (
      status = 'PUBLISHED'
      OR (
        status = 'ARCHIVED'
        AND EXISTS (
          SELECT 1 FROM public.policy_acknowledgements a
          WHERE a."packetId" = policy_packets.id AND a."userId" = auth.uid()
        )
      )
    )
  );

CREATE POLICY "admin_all_policy_documents" ON public.policy_documents FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
-- The subquery runs under the caller's own policies on policy_packets.
CREATE POLICY "tutor_read_policy_documents" ON public.policy_documents FOR SELECT
  USING (
    public.current_user_role() = 'TEACHER'
    AND EXISTS (SELECT 1 FROM public.policy_packets p WHERE p.id = policy_documents."packetId")
  );

CREATE POLICY "admin_read_policy_read_progress" ON public.policy_read_progress FOR SELECT
  USING (public.is_admin());
CREATE POLICY "self_read_policy_read_progress" ON public.policy_read_progress FOR SELECT
  USING ("userId" = auth.uid());
CREATE POLICY "self_insert_policy_read_progress" ON public.policy_read_progress FOR INSERT
  WITH CHECK (
    "userId" = auth.uid()
    AND public.current_user_role() = 'TEACHER'
    AND EXISTS (SELECT 1 FROM public.policy_documents d WHERE d.id = policy_read_progress."documentId")
  );
CREATE POLICY "self_update_policy_read_progress" ON public.policy_read_progress FOR UPDATE
  USING ("userId" = auth.uid())
  WITH CHECK ("userId" = auth.uid());

-- Read only for everyone who signs in. There is deliberately no insert, update
-- or delete policy, not even for admins.
CREATE POLICY "admin_read_policy_acknowledgements" ON public.policy_acknowledgements FOR SELECT
  USING (public.is_admin());
CREATE POLICY "self_read_policy_acknowledgements" ON public.policy_acknowledgements FOR SELECT
  USING ("userId" = auth.uid());

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.policy_acknowledgements FROM anon, authenticated;

-- ── Functions ────────────────────────────────────────────────────────────

-- Publishes a draft and retires the version it replaces, in one transaction.
CREATE FUNCTION public.publish_policy_packet(p_packet_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  packet public.policy_packets%ROWTYPE;
BEGIN
  IF NOT COALESCE(public.is_admin(), FALSE) THEN
    RAISE EXCEPTION 'Only an admin can publish' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO packet FROM public.policy_packets WHERE id = p_packet_id FOR UPDATE;
  IF NOT FOUND OR packet.status <> 'DRAFT' THEN
    RAISE EXCEPTION 'Only a draft can be published';
  END IF;

  UPDATE public.policy_packets SET status = 'PUBLISHED' WHERE id = p_packet_id;

  IF packet."replacesPacketId" IS NOT NULL THEN
    UPDATE public.policy_packets SET status = 'ARCHIVED'
    WHERE id = packet."replacesPacketId" AND status = 'PUBLISHED';
  END IF;
END;
$$;

-- Starts the next version as a draft with the same wording. Documents are
-- uploaded again so every version keeps its own files.
CREATE FUNCTION public.create_policy_packet_version(p_packet_id UUID)
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
    "hrContactName", "hrWhatsapp", "hrEmail", "replacesPacketId", "createdByUserId"
  )
  VALUES (
    source.title, source.version + 1, source."checklistItems", source.statement,
    source."hrContactName", source."hrWhatsapp", source."hrEmail", source.id, auth.uid()
  )
  RETURNING id INTO draft_id;

  RETURN draft_id;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_policy_packet(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_policy_packet(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.create_policy_packet_version(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_policy_packet_version(UUID) TO authenticated;
