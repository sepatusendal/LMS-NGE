import { createClient } from "@/lib/supabase/client";
import { fetchAllPages, fetchInChunks } from "@/lib/supabase/paginate";
import {
  ACKNOWLEDGEMENT_COLUMNS,
  DOCUMENT_COLUMNS,
  PACKET_COLUMNS,
  checklistFromFields,
  type Acknowledgement,
  type AcknowledgeError,
  type AcknowledgeRequest,
  type PacketFormInput,
  type PolicyDocument,
  type PolicyPacket,
  type ReadProgress,
} from "./schema";
import {
  DEFAULT_AUDIENCE,
  fromAudienceForm,
  type AudienceChange,
  type AudiencePerson,
  type PolicyAudience,
} from "./audience";
import type { AppRole } from "@/features/auth/role-routes";
import { EMPTY_POPUP_STATE, type PopupEvent, type PopupState } from "./popup-rules";
import { toPrintable } from "./printable";

async function fetchDocuments(packetIds: string[]): Promise<PolicyDocument[]> {
  const supabase = createClient();
  const rows = await fetchInChunks<PolicyDocument>(packetIds, (chunk, from, to) =>
    supabase
      .from("policy_documents")
      .select(DOCUMENT_COLUMNS)
      .in("packetId", chunk)
      .order("sortOrder")
      .order("id")
      .range(from, to),
  );
  return rows.sort((a, b) => a.sortOrder - b.sortOrder);
}

// ── Recipient ──────────────────────────────────────────────────────────────────

export interface MyPolicyDocument extends PolicyDocument {
  opened: boolean;
  furthestPage: number;
  completed: boolean;
}

export interface MyPolicy {
  packet: PolicyPacket;
  documents: MyPolicyDocument[];
  acknowledgement: Acknowledgement | null;
  popup: PopupState;
}

export interface MyPolicies {
  userId: string;
  /** Changes with every new sign-in, so "later" on the popup lasts one login. */
  sessionKey: string;
  items: MyPolicy[];
}

/** The packets that target this account, plus retired or dropped ones it had
 * confirmed. The database picks them: an admin can read every packet. */
export async function fetchMyPolicies(): Promise<MyPolicies> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const [idsResult, acknowledgementsResult, popupResult] = await Promise.all([
    supabase.rpc("my_policy_packet_ids"),
    supabase.from("policy_acknowledgements").select(ACKNOWLEDGEMENT_COLUMNS).eq("userId", user.id),
    supabase
      .from("policy_popup_states")
      .select("packetId, shownCount, shownDay, shownOnDay, snoozeCount, lastShownAt, lastSessionId")
      .eq("userId", user.id),
  ]);
  if (idsResult.error) throw idsResult.error;
  if (acknowledgementsResult.error) throw acknowledgementsResult.error;
  if (popupResult.error) throw popupResult.error;

  const ids = (idsResult.data ?? []) as string[];
  let packets: PolicyPacket[] = [];
  if (ids.length > 0) {
    const { data, error } = await supabase
      .from("policy_packets")
      .select(PACKET_COLUMNS)
      .in("id", ids)
      .order("publishedAt", { ascending: false });
    if (error) throw error;
    packets = data as unknown as PolicyPacket[];
  }
  const acknowledgements = acknowledgementsResult.data as unknown as Acknowledgement[];
  const popups = new Map(
    (popupResult.data as unknown as (PopupState & { packetId: string })[]).map((row) => [row.packetId, row]),
  );
  const documents = await fetchDocuments(packets.map((p) => p.id));
  const progress = await fetchInChunks<ReadProgress>(
    documents.map((d) => d.id),
    (chunk, from, to) =>
      supabase
        .from("policy_read_progress")
        .select("userId, documentId, furthestPage, completedAt")
        .eq("userId", user.id)
        .in("documentId", chunk)
        .order("documentId")
        .range(from, to),
  );
  const progressByDocument = new Map(progress.map((p) => [p.documentId, p]));

  return {
    userId: user.id,
    sessionKey: `${user.id}:${user.last_sign_in_at ?? ""}`,
    items: packets.map((packet) => ({
      packet,
      acknowledgement: acknowledgements.find((a) => a.packetId === packet.id) ?? null,
      popup: popups.get(packet.id) ?? EMPTY_POPUP_STATE,
      documents: documents
        .filter((d) => d.packetId === packet.id)
        .map((d) => {
          const row = progressByDocument.get(d.id);
          return {
            ...d,
            opened: Boolean(row),
            furthestPage: row?.furthestPage ?? 0,
            completed: Boolean(row?.completedAt),
          };
        }),
    })),
  };
}

/** Counted on the server clock; the history only steers the reminder. */
export async function recordPopup(packetId: string, event: PopupEvent, sessionId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("record_policy_popup", {
    p_packet_id: packetId,
    p_event: event,
    p_session_id: sessionId,
  });
  if (error) throw error;
}

export function isPendingPolicy(item: MyPolicy): boolean {
  return item.packet.status === "PUBLISHED" && !item.acknowledgement;
}

/** The database keeps the furthest page and decides completion. */
export async function saveReadProgress(documentId: string, furthestPage: number): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("policy_read_progress")
    .upsert({ userId: user.id, documentId, furthestPage }, { onConflict: "userId,documentId" });
  if (error) throw error;
}

export class ConfirmPolicyError extends Error {
  constructor(public code: AcknowledgeError) {
    super(code);
  }
}

export async function confirmPolicy(
  packetId: string,
  body: AcknowledgeRequest,
): Promise<{ id: string; receiptNumber: string }> {
  let response: Response;
  try {
    response = await fetch(`/api/policies/${packetId}/acknowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ConfirmPolicyError("SERVER");
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.id) throw new ConfirmPolicyError(payload?.code ?? "SERVER");
  return payload;
}

// ── Admin ──────────────────────────────────────────────────────────────────

/** Active accounts that can be picked or targeted. A tutor also needs an active
 * tutor profile, the same rule the database applies. */
export async function fetchAudiencePeople(): Promise<AudiencePerson[]> {
  const supabase = createClient();
  const [users, teachers] = await Promise.all([
    fetchAllPages<{ id: string; fullName: string; email: string; role: AppRole }>((from, to) =>
      supabase
        .from("users")
        .select("id, fullName, email, role")
        .eq("isActive", true)
        .is("deletedAt", null)
        .order("id")
        .range(from, to),
    ),
    fetchAllPages<{ userId: string; tutorId: string | null }>((from, to) =>
      supabase
        .from("teachers")
        .select("userId, tutorId")
        .eq("isActive", true)
        .is("deletedAt", null)
        .order("id")
        .range(from, to),
    ),
  ]);
  const tutorIds = new Map(teachers.map((row) => [row.userId, row.tutorId]));
  return users
    .filter((u) => u.role !== "TEACHER" || tutorIds.has(u.id))
    .map((u) => ({
      userId: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      tutorId: u.role === "TEACHER" ? (tutorIds.get(u.id) ?? null) : null,
    }))
    .sort((x, y) => x.fullName.localeCompare(y.fullName, "id"));
}

async function fetchAcknowledgements(packetIds: string[]): Promise<Acknowledgement[]> {
  const supabase = createClient();
  return fetchInChunks<Acknowledgement>(packetIds, (chunk, from, to) =>
    supabase
      .from("policy_acknowledgements")
      .select(ACKNOWLEDGEMENT_COLUMNS)
      .in("packetId", chunk)
      .order("id")
      .range(from, to),
  );
}

export interface PacketSummary extends PolicyPacket {
  /** Current recipients, and how many of them confirmed. */
  recipients: number;
  confirmed: number;
}

export async function fetchPacketsAdmin(): Promise<PacketSummary[]> {
  const supabase = createClient();
  const [packetsResult, summaries] = await Promise.all([
    supabase.from("policy_packets").select(PACKET_COLUMNS).order("createdAt", { ascending: false }),
    fetchAllPages<{ packetId: string; recipients: number; confirmed: number }>((from, to) =>
      supabase.rpc("policy_packet_summaries").order("packetId").range(from, to),
    ),
  ]);
  if (packetsResult.error) throw packetsResult.error;
  const byPacket = new Map(summaries.map((row) => [row.packetId, row]));
  return (packetsResult.data as unknown as PolicyPacket[]).map((packet) => ({
    ...packet,
    recipients: byPacket.get(packet.id)?.recipients ?? 0,
    confirmed: byPacket.get(packet.id)?.confirmed ?? 0,
  }));
}

export interface PacketDetail {
  packet: PolicyPacket;
  documents: PolicyDocument[];
  audience: PolicyAudience;
  /** Changes made after publishing, newest first. */
  audienceChanges: AudienceChange[];
}

export async function fetchPacketAdmin(id: string): Promise<PacketDetail> {
  const supabase = createClient();
  const [packetResult, audienceResult, changesResult, documents] = await Promise.all([
    supabase.from("policy_packets").select(PACKET_COLUMNS).eq("id", id).single(),
    supabase.from("policy_audiences").select("roles, includedUserIds, excludedUserIds").eq("packetId", id).maybeSingle(),
    supabase
      .from("policy_audience_changes")
      .select("id, changedByName, changedAt, after")
      .eq("packetId", id)
      .order("changedAt", { ascending: false })
      .limit(20),
    fetchDocuments([id]),
  ]);
  if (packetResult.error) throw packetResult.error;
  if (audienceResult.error) throw audienceResult.error;
  if (changesResult.error) throw changesResult.error;
  return {
    packet: packetResult.data as unknown as PolicyPacket,
    documents,
    // A draft that never saved one starts from the default selection.
    audience: (audienceResult.data as unknown as PolicyAudience | null) ?? DEFAULT_AUDIENCE,
    audienceChanges: changesResult.data as unknown as AudienceChange[],
  };
}

export interface MonitorRow {
  userId: string;
  fullName: string;
  email: string;
  role: AppRole;
  tutorId: string | null;
  /** False for someone who confirmed and is no longer expected to. */
  isRecipient: boolean;
  documentsRead: number;
  popupShown: number;
  popupSnoozed: number;
  acknowledgement: Acknowledgement | null;
}

/** One row per current recipient, plus anyone who confirmed and has since left
 * the list. */
export async function fetchPacketMonitor(packetId: string): Promise<{ rows: MonitorRow[]; documentCount: number }> {
  const supabase = createClient();
  const documents = await fetchDocuments([packetId]);
  const [recipients, acknowledgements, progress, popups] = await Promise.all([
    fetchAllPages<AudiencePerson>((from, to) =>
      supabase.rpc("policy_packet_recipients", { p_packet_id: packetId }).order("userId").range(from, to),
    ),
    fetchAcknowledgements([packetId]),
    fetchInChunks<ReadProgress>(
      documents.map((d) => d.id),
      (chunk, from, to) =>
        supabase
          .from("policy_read_progress")
          .select("userId, documentId, furthestPage, completedAt")
          .in("documentId", chunk)
          .order("documentId")
          .order("userId")
          .range(from, to),
    ),
    fetchAllPages<{ userId: string; shownCount: number; snoozeCount: number }>((from, to) =>
      supabase
        .from("policy_popup_states")
        .select("userId, shownCount, snoozeCount")
        .eq("packetId", packetId)
        .order("userId")
        .range(from, to),
    ),
  ]);

  const readCount = new Map<string, number>();
  for (const row of progress) {
    if (row.completedAt) readCount.set(row.userId, (readCount.get(row.userId) ?? 0) + 1);
  }
  const popupByUser = new Map(popups.map((p) => [p.userId, p]));
  const acknowledgementByUser = new Map(acknowledgements.map((a) => [a.userId, a]));
  const recipientIds = new Set(recipients.map((r) => r.userId));

  const stats = (userId: string) => ({
    documentsRead: readCount.get(userId) ?? 0,
    popupShown: popupByUser.get(userId)?.shownCount ?? 0,
    popupSnoozed: popupByUser.get(userId)?.snoozeCount ?? 0,
  });
  const rows: MonitorRow[] = [
    ...recipients.map((r) => ({
      ...r,
      ...stats(r.userId),
      isRecipient: true,
      acknowledgement: acknowledgementByUser.get(r.userId) ?? null,
    })),
    ...acknowledgements
      .filter((a) => !recipientIds.has(a.userId))
      .map((a) => ({
        userId: a.userId,
        fullName: a.fullName,
        email: a.email,
        role: a.role,
        tutorId: a.tutorId,
        ...stats(a.userId),
        isRecipient: false,
        acknowledgement: a,
      })),
  ];
  rows.sort((x, y) => x.fullName.localeCompare(y.fullName, "id"));
  return { rows, documentCount: documents.length };
}

/** Settings that stay editable after publishing. */
function reminderSettings(input: PacketFormInput) {
  return {
    deadline: input.deadline || null,
    hrContactName: input.hrContactName || null,
    hrWhatsapp: input.hrWhatsapp || null,
    hrEmail: input.hrEmail || null,
    noticeTitle: input.noticeTitle || null,
    noticeMessage: input.noticeMessage || null,
    popupSettings: input.popup,
  };
}

async function saveAudience(packetId: string, input: PacketFormInput): Promise<void> {
  const supabase = createClient();
  const audience = fromAudienceForm(input.audience);
  const { error } = await supabase.rpc("set_policy_audience", {
    p_packet_id: packetId,
    p_roles: audience.roles,
    p_included: audience.includedUserIds,
    p_excluded: audience.excludedUserIds,
  });
  if (error) throw error;
}

function wording(input: PacketFormInput) {
  return {
    title: toPrintable(input.title),
    checklistItems: checklistFromFields(input.checklist),
    statement: toPrintable(input.statement),
  };
}

export async function createPacket(input: PacketFormInput): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesi tidak ditemukan, silakan login ulang");
  const { data, error } = await supabase
    .from("policy_packets")
    .insert({ ...wording(input), ...reminderSettings(input), createdByUserId: user.id })
    .select("id")
    .single();
  if (error) throw error;
  try {
    await saveAudience(data.id as string, input);
  } catch (audienceError) {
    // The form stays open for another try, which must not leave a twin behind.
    await supabase.from("policy_packets").delete().eq("id", data.id);
    throw audienceError;
  }
  return data.id as string;
}

/** A published packet only accepts its deadline, HR contact, notice, pop-up
 * settings and recipients. */
export async function updatePacket(packet: PolicyPacket, input: PacketFormInput): Promise<void> {
  const supabase = createClient();
  const changes =
    packet.status === "DRAFT" ? { ...wording(input), ...reminderSettings(input) } : reminderSettings(input);
  const { error } = await supabase.from("policy_packets").update(changes).eq("id", packet.id);
  if (error) throw error;
  if (packet.status !== "ARCHIVED") await saveAudience(packet.id, input);
}

export async function publishPacket(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("publish_policy_packet", { p_packet_id: id });
  if (error) throw error;
}

export async function createPacketVersion(id: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_policy_packet_version", { p_packet_id: id });
  if (error) throw error;
  return data as string;
}

export async function archivePacket(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("policy_packets").update({ status: "ARCHIVED" }).eq("id", id);
  if (error) throw error;
}

async function callApi(url: string, init: RequestInit): Promise<void> {
  const response = await fetch(url, init);
  if (response.ok) return;
  if (response.status === 413) throw new Error("File terlalu besar (max 4MB)");
  const payload = await response.json().catch(() => null);
  throw new Error(payload?.error ?? `Request gagal (${response.status})`);
}

export function deleteDraftPacket(id: string): Promise<void> {
  return callApi(`/api/policies/${id}`, { method: "DELETE" });
}

export function uploadPolicyDocument(packetId: string, form: FormData): Promise<void> {
  return callApi(`/api/policies/${packetId}/documents`, { method: "POST", body: form });
}

export function deletePolicyDocument(documentId: string): Promise<void> {
  return callApi(`/api/policies/documents/${documentId}`, { method: "DELETE" });
}
