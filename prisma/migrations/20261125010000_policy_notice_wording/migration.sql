-- Admin-editable wording for the tutor pop-up and banner of a policy packet.
-- Empty means the app's default text. This is a reminder, not part of what a
-- tutor acknowledges, so it stays editable after publishing (the packet guard
-- only freezes the columns it lists).

ALTER TABLE "policy_packets"
  ADD COLUMN "noticeTitle" TEXT,
  ADD COLUMN "noticeMessage" TEXT,
  ADD CONSTRAINT "policy_packets_noticeTitle_length" CHECK (char_length("noticeTitle") <= 80),
  ADD CONSTRAINT "policy_packets_noticeMessage_length" CHECK (char_length("noticeMessage") <= 300);

-- A new version starts with the previous wording.
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

  RETURN draft_id;
END;
$$;
