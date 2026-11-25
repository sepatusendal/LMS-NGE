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

// ── Tutor ──────────────────────────────────────────────────────────────────

export interface MyPolicyDocument extends PolicyDocument {
  opened: boolean;
  furthestPage: number;
  completed: boolean;
}

export interface MyPolicy {
  packet: PolicyPacket;
  documents: MyPolicyDocument[];
  acknowledgement: Acknowledgement | null;
}

export interface MyPolicies {
  userId: string;
  /** Changes with every new sign-in, so "later" on the popup lasts one login. */
  sessionKey: string;
  items: MyPolicy[];
}

/** Published packets, plus retired ones this tutor had confirmed. */
export async function fetchMyPolicies(): Promise<MyPolicies> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const [packetsResult, acknowledgementsResult] = await Promise.all([
    supabase
      .from("policy_packets")
      .select(PACKET_COLUMNS)
      .in("status", ["PUBLISHED", "ARCHIVED"])
      .order("publishedAt", { ascending: false }),
    supabase.from("policy_acknowledgements").select(ACKNOWLEDGEMENT_COLUMNS).eq("userId", user.id),
  ]);
  if (packetsResult.error) throw packetsResult.error;
  if (acknowledgementsResult.error) throw acknowledgementsResult.error;

  const packets = packetsResult.data as unknown as PolicyPacket[];
  const acknowledgements = acknowledgementsResult.data as unknown as Acknowledgement[];
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

export interface ActiveTutor {
  userId: string;
  tutorId: string | null;
  fullName: string;
  email: string;
}

interface TeacherRow {
  userId: string;
  tutorId: string | null;
  isActive: boolean;
  deletedAt: string | null;
  users: { fullName: string; email: string; role: string; isActive: boolean; deletedAt: string | null } | null;
}

/** Everyone who is expected to confirm: active tutors, including new ones. */
async function fetchActiveTutors(): Promise<ActiveTutor[]> {
  const supabase = createClient();
  const rows = await fetchAllPages<TeacherRow>((from, to) =>
    supabase
      .from("teachers")
      .select("userId, tutorId, isActive, deletedAt, users(fullName, email, role, isActive, deletedAt)")
      .order("id")
      .range(from, to),
  );
  return rows.flatMap((row) => {
    const user = row.users;
    if (!row.isActive || row.deletedAt || !user || user.role !== "TEACHER" || !user.isActive || user.deletedAt) {
      return [];
    }
    return [{ userId: row.userId, tutorId: row.tutorId, fullName: user.fullName, email: user.email }];
  });
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
  confirmed: number;
  activeTutors: number;
}

export async function fetchPacketsAdmin(): Promise<PacketSummary[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("policy_packets")
    .select(PACKET_COLUMNS)
    .order("createdAt", { ascending: false });
  if (error) throw error;
  const packets = data as unknown as PolicyPacket[];
  const [tutors, acknowledgements] = await Promise.all([
    fetchActiveTutors(),
    fetchAcknowledgements(packets.map((p) => p.id)),
  ]);
  const active = new Set(tutors.map((t) => t.userId));
  return packets.map((packet) => ({
    ...packet,
    activeTutors: tutors.length,
    confirmed: acknowledgements.filter((a) => a.packetId === packet.id && active.has(a.userId)).length,
  }));
}

export async function fetchPacketAdmin(id: string): Promise<{ packet: PolicyPacket; documents: PolicyDocument[] }> {
  const supabase = createClient();
  const { data, error } = await supabase.from("policy_packets").select(PACKET_COLUMNS).eq("id", id).single();
  if (error) throw error;
  return { packet: data as unknown as PolicyPacket, documents: await fetchDocuments([id]) };
}

export interface MonitorRow {
  userId: string;
  fullName: string;
  email: string;
  tutorId: string | null;
  isActiveTutor: boolean;
  documentsRead: number;
  acknowledgement: Acknowledgement | null;
}

/** One row per active tutor, plus anyone who confirmed and has since left. */
export async function fetchPacketMonitor(packetId: string): Promise<{ rows: MonitorRow[]; documentCount: number }> {
  const supabase = createClient();
  const documents = await fetchDocuments([packetId]);
  const [tutors, acknowledgements, progress] = await Promise.all([
    fetchActiveTutors(),
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
  ]);

  const readCount = new Map<string, number>();
  for (const row of progress) {
    if (row.completedAt) readCount.set(row.userId, (readCount.get(row.userId) ?? 0) + 1);
  }
  const acknowledgementByUser = new Map(acknowledgements.map((a) => [a.userId, a]));
  const activeIds = new Set(tutors.map((t) => t.userId));

  const rows: MonitorRow[] = [
    ...tutors.map((t) => ({
      ...t,
      isActiveTutor: true,
      documentsRead: readCount.get(t.userId) ?? 0,
      acknowledgement: acknowledgementByUser.get(t.userId) ?? null,
    })),
    ...acknowledgements
      .filter((a) => !activeIds.has(a.userId))
      .map((a) => ({
        userId: a.userId,
        fullName: a.fullName,
        email: a.email,
        tutorId: a.tutorId,
        isActiveTutor: false,
        documentsRead: readCount.get(a.userId) ?? 0,
        acknowledgement: a,
      })),
  ];
  rows.sort((a, b) => a.fullName.localeCompare(b.fullName, "id"));
  return { rows, documentCount: documents.length };
}

function contactAndDeadline(input: PacketFormInput) {
  return {
    deadline: input.deadline || null,
    hrContactName: input.hrContactName || null,
    hrWhatsapp: input.hrWhatsapp || null,
    hrEmail: input.hrEmail || null,
  };
}

function wording(input: PacketFormInput) {
  return {
    title: input.title,
    checklistItems: checklistFromFields(input.checklist),
    statement: input.statement,
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
    .insert({ ...wording(input), ...contactAndDeadline(input), createdByUserId: user.id })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/** A published packet only accepts its deadline and HR contact. */
export async function updatePacket(packet: PolicyPacket, input: PacketFormInput): Promise<void> {
  const supabase = createClient();
  const changes =
    packet.status === "DRAFT" ? { ...wording(input), ...contactAndDeadline(input) } : contactAndDeadline(input);
  const { error } = await supabase.from("policy_packets").update(changes).eq("id", packet.id);
  if (error) throw error;
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
