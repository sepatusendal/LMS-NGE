-- How often the policy pop-up comes back, chosen by the admin per packet, and
-- one history row per recipient so "once", "once a day" and the limits hold
-- across devices. This drives a reminder only: it is not evidence and it never
-- records a confirmation.

-- NULL means the application default. The application validates the contents.
ALTER TABLE "policy_packets" ADD COLUMN "popupSettings" JSONB;
ALTER TABLE "policy_packets"
  ADD CONSTRAINT "policy_packets_popupSettings_shape"
  CHECK ("popupSettings" IS NULL
         OR (jsonb_typeof("popupSettings") = 'object' AND length("popupSettings"::text) <= 1000));

CREATE TABLE "policy_popup_states" (
    "userId" UUID NOT NULL,
    "packetId" UUID NOT NULL,
    "shownCount" INTEGER NOT NULL DEFAULT 0,
    -- The day, in Jakarta time, that "shownOnDay" counts.
    "shownDay" DATE,
    "shownOnDay" INTEGER NOT NULL DEFAULT 0,
    "snoozeCount" INTEGER NOT NULL DEFAULT 0,
    "firstShownAt" TIMESTAMPTZ(3),
    "lastShownAt" TIMESTAMPTZ(3),
    "lastSnoozedAt" TIMESTAMPTZ(3),
    "lastSessionId" TEXT,

    CONSTRAINT "policy_popup_states_pkey" PRIMARY KEY ("userId", "packetId")
);

ALTER TABLE "policy_popup_states"
  ADD CONSTRAINT "policy_popup_states_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "policy_popup_states"
  ADD CONSTRAINT "policy_popup_states_packetId_fkey"
  FOREIGN KEY ("packetId") REFERENCES "policy_packets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "policy_popup_states_packetId_idx" ON "policy_popup_states"("packetId");

ALTER TABLE public.policy_popup_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "self_read_policy_popup_states" ON public.policy_popup_states FOR SELECT
  USING ("userId" = auth.uid());
CREATE POLICY "admin_read_policy_popup_states" ON public.policy_popup_states FOR SELECT
  USING (public.is_admin());
-- Counts only move through record_policy_popup, so a client cannot reset them.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.policy_popup_states FROM anon, authenticated;

-- Counts one appearance ('SHOWN') or one "later" ('SNOOZED') for the caller,
-- using the server clock. Silently ignored when the packet no longer targets
-- the caller, so a stale tab does not raise errors.
CREATE FUNCTION public.record_policy_popup(p_packet_id UUID, p_event TEXT, p_session_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::DATE;
BEGIN
  IF p_event NOT IN ('SHOWN', 'SNOOZED') THEN
    RAISE EXCEPTION 'Unknown pop-up event';
  END IF;
  IF auth.uid() IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.policy_packets p WHERE p.id = p_packet_id AND p.status = 'PUBLISHED')
     OR NOT public.policy_packet_targets_me(p_packet_id) THEN
    RETURN;
  END IF;

  IF p_event = 'SHOWN' THEN
    INSERT INTO public.policy_popup_states AS s
      ("userId", "packetId", "shownCount", "shownDay", "shownOnDay", "firstShownAt", "lastShownAt", "lastSessionId")
    VALUES (auth.uid(), p_packet_id, 1, today, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, left(p_session_id, 64))
    ON CONFLICT ("userId", "packetId") DO UPDATE SET
      "shownCount" = s."shownCount" + 1,
      "shownOnDay" = CASE WHEN s."shownDay" = today THEN s."shownOnDay" + 1 ELSE 1 END,
      "shownDay" = today,
      "firstShownAt" = COALESCE(s."firstShownAt", CURRENT_TIMESTAMP),
      "lastShownAt" = CURRENT_TIMESTAMP,
      "lastSessionId" = EXCLUDED."lastSessionId";
  ELSE
    INSERT INTO public.policy_popup_states AS s ("userId", "packetId", "snoozeCount", "lastSnoozedAt")
    VALUES (auth.uid(), p_packet_id, 1, CURRENT_TIMESTAMP)
    ON CONFLICT ("userId", "packetId") DO UPDATE SET
      "snoozeCount" = s."snoozeCount" + 1,
      "lastSnoozedAt" = CURRENT_TIMESTAMP;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.record_policy_popup(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_policy_popup(UUID, TEXT, TEXT) TO authenticated;

-- A new version also keeps the pop-up settings.
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
    "hrContactName", "hrWhatsapp", "hrEmail", "noticeTitle", "noticeMessage", "popupSettings",
    "replacesPacketId", "createdByUserId"
  )
  VALUES (
    source.title, source.version + 1, source."checklistItems", source.statement,
    source."hrContactName", source."hrWhatsapp", source."hrEmail", source."noticeTitle", source."noticeMessage",
    source."popupSettings", source.id, auth.uid()
  )
  RETURNING id INTO draft_id;

  INSERT INTO public.policy_audiences ("packetId", "roles", "includedUserIds", "excludedUserIds", "updatedByUserId")
  SELECT draft_id, a."roles", a."includedUserIds", a."excludedUserIds", auth.uid()
  FROM public.policy_audiences a
  WHERE a."packetId" = p_packet_id;

  RETURN draft_id;
END;
$$;
