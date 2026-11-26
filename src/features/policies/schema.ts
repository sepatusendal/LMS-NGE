import { z } from "zod";
import { todayLocalDateStr } from "@/lib/date";
import type { AppRole } from "@/features/auth/role-routes";
import { isAudienceChosen } from "./audience";
import { popupSettingsSchema } from "./popup-rules";
import { toPrintable, unprintableCharacters } from "./printable";

// Policy documents that the chosen recipients read, sign and acknowledge.
// Shared by the browser and the API routes, so keep it free of server imports.

export type PolicyPacketStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface PolicyPacket {
  id: string;
  title: string;
  version: number;
  status: PolicyPacketStatus;
  checklistItems: string[];
  statement: string;
  /** "YYYY-MM-DD"; the last day to confirm before the portal is locked. */
  deadline: string | null;
  hrContactName: string | null;
  hrWhatsapp: string | null;
  hrEmail: string | null;
  /** Pop-up and banner wording; null uses the default text. */
  noticeTitle: string | null;
  noticeMessage: string | null;
  /** Stored JSON; read it with parsePopupSettings. */
  popupSettings: unknown;
  replacesPacketId: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface PolicyDocument {
  id: string;
  packetId: string;
  sortOrder: number;
  title: string;
  documentNumber: string | null;
  versionLabel: string | null;
  effectiveDate: string | null;
  fileName: string;
  fileSize: number;
  sha256: string;
  pageCount: number;
}

export interface ReadProgress {
  userId: string;
  documentId: string;
  furthestPage: number;
  completedAt: string | null;
}

export interface Acknowledgement {
  id: string;
  packetId: string;
  userId: string;
  receiptNumber: string;
  fullName: string;
  email: string;
  role: AppRole;
  tutorId: string | null;
  acknowledgedAt: string;
}

export const PACKET_COLUMNS =
  "id, title, version, status, checklistItems, statement, deadline, hrContactName, hrWhatsapp, hrEmail, noticeTitle, noticeMessage, popupSettings, replacesPacketId, publishedAt, createdAt";
export const DOCUMENT_COLUMNS =
  "id, packetId, sortOrder, title, documentNumber, versionLabel, effectiveDate, fileName, fileSize, sha256, pageCount";
export const ACKNOWLEDGEMENT_COLUMNS =
  "id, packetId, userId, receiptNumber, fullName, email, role, tutorId, acknowledgedAt";

/** Hosting rejects request bodies a little above this, see api/drive/upload. */
export const MAX_POLICY_FILE_BYTES = 4 * 1024 * 1024;

// Starting wording for a new packet; the admin can edit it while it is a draft.
export const DEFAULT_CHECKLIST = [
  "Saya telah menerima salinan Peraturan Perusahaan PT NUFA GLOBAL EDUKASI 2026–2028.",
  "Saya telah menerima Employee Policy.",
  "Saya telah menerima Disciplinary & Warning Policy.",
  "Saya telah mengikuti/atau telah diberikan penjelasan mengenai dokumen tersebut.",
  "Saya memahami bahwa saya dapat menyampaikan pertanyaan atau meminta klarifikasi kepada HR mengenai ketentuan yang berlaku.",
];
export const DEFAULT_STATEMENT =
  "Acknowledgement ini merupakan bukti penerimaan dan penyampaian dokumen, bukan pengesampingan hak Pekerja berdasarkan peraturan perundang-undangan, Peraturan Perusahaan, atau Perjanjian Kerja.";

export function isOverdue(deadline: string | null, today = todayLocalDateStr()): boolean {
  return Boolean(deadline) && today > (deadline as string);
}

/** The role as written on the receipt and in the identity block. */
export const ROLE_NAMES: Record<AppRole, string> = { TEACHER: "Tutor", COORDINATOR: "Koordinator", ADMIN: "Admin" };

/** wa.me wants the international number without "+"; local numbers start with 0. */
export function whatsappLink(number: string, message: string): string {
  const digits = number.replace(/\D/g, "").replace(/^0/, "62");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export const MAX_CHECKLIST_ITEMS = 20;
// Mirrored by CHECK constraints in the database.
export const MAX_NOTICE_TITLE_LENGTH = 80;
export const MAX_NOTICE_MESSAGE_LENGTH = 300;
const MAX_CHECKLIST_ITEM_LENGTH = 500;

// List markers that come along when a list is copied from a document: boxes and
// bullet glyphs, "-" or "*" followed by a space, and "1." / "1)" numbering.
const LIST_MARKER = /^(?:(?:[☐☑☒✓✔•▪●◦‣]|\[[ xX]?\])\s*|(?:[-*–]|\d{1,2}[.)])\s+)/;

/** Splits pasted text into checklist items, one per non-empty line. */
export function splitChecklist(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim().replace(LIST_MARKER, "").trim())
    .filter(Boolean);
}

/** What gets stored: one tidy line per filled-in field. */
export function checklistFromFields(fields: { text: string }[]): string[] {
  return fields.map((field) => toPrintable(field.text).replace(/\s+/g, " ").trim()).filter(Boolean);
}

export function buildPacketFormSchema(t: (key: string, values?: { characters: string }) => string) {
  /** These words end up in the receipt PDF, so they have to be printable. */
  const checkPrintable = (value: string, context: z.RefinementCtx) => {
    const characters = unprintableCharacters(value);
    if (characters.length === 0) return;
    context.addIssue({
      code: "custom",
      message: t("validation.unprintable", { characters: characters.join(" ") }),
    });
  };
  return z.object({
    title: z
      .string()
      .trim()
      .min(1, t("validation.titleRequired"))
      .max(150, t("validation.titleMax"))
      .superRefine(checkPrintable),
    // One object per item because react-hook-form field arrays need objects.
    checklist: z
      .array(
        z.object({
          text: z.string().max(MAX_CHECKLIST_ITEM_LENGTH, t("validation.checklistItemMax")).superRefine(checkPrintable),
        }),
      )
      .refine((v) => checklistFromFields(v).length > 0, t("validation.checklistRequired"))
      .refine((v) => checklistFromFields(v).length <= MAX_CHECKLIST_ITEMS, t("validation.checklistMax")),
    statement: z
      .string()
      .trim()
      .min(1, t("validation.statementRequired"))
      .max(2000, t("validation.statementMax"))
      .superRefine(checkPrintable),
    deadline: z.string(),
    noticeTitle: z.string().trim().max(MAX_NOTICE_TITLE_LENGTH, t("validation.noticeTitleMax")),
    noticeMessage: z.string().trim().max(MAX_NOTICE_MESSAGE_LENGTH, t("validation.noticeMessageMax")),
    hrContactName: z.string().trim().max(100),
    hrWhatsapp: z
      .string()
      .trim()
      .refine((v) => v === "" || /^\+?[\d\s-]{8,20}$/.test(v), t("validation.whatsappInvalid")),
    hrEmail: z
      .string()
      .trim()
      .refine((v) => v === "" || z.string().email().safeParse(v).success, t("validation.emailInvalid")),
    audience: z
      .object({
        mode: z.enum(["ALL", "ROLES", "PEOPLE"]),
        roles: z.array(z.enum(["TEACHER", "COORDINATOR", "ADMIN"])),
        includedUserIds: z.array(z.string()).max(1000),
        excludedUserIds: z.array(z.string()).max(1000),
      })
      .refine(isAudienceChosen, t("validation.audienceRequired")),
    popup: popupSettingsSchema,
  });
}
export type PacketFormInput = z.infer<ReturnType<typeof buildPacketFormSchema>>;

// ── Signature ──────────────────────────────────────────────────────────────
// Kept as pen strokes (points in the drawing pad's own pixels) so the server
// can check it and draw it into the receipt PDF as vectors. It is never stored
// as an image, and never in the database.

const point = z.tuple([z.number().finite(), z.number().finite()]);

// The pad stops recording here, so a long scribble is cut off, never rejected.
export const MAX_SIGNATURE_POINTS = 10000;
export const MAX_STROKE_POINTS = 5000;
export const MAX_SIGNATURE_STROKES = 300;

export const signatureSchema = z.object({
  width: z.number().positive().max(4000),
  height: z.number().positive().max(2000),
  strokes: z.array(z.array(point).min(1).max(MAX_STROKE_POINTS)).min(1).max(MAX_SIGNATURE_STROKES),
});
export type Signature = z.infer<typeof signatureSchema>;

const MIN_SIGNATURE_LENGTH = 100;
const MIN_SIGNATURE_WIDTH = 40;

/** A tap or a tiny mark is not a signature. */
export function isSignatureSufficient(signature: Signature | null): boolean {
  if (!signature) return false;
  let points = 0;
  let length = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  for (const stroke of signature.strokes) {
    for (let i = 0; i < stroke.length; i++) {
      const [x, y] = stroke[i];
      if (x < 0 || y < 0 || x > signature.width || y > signature.height) return false;
      points++;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      if (i > 0) length += Math.hypot(x - stroke[i - 1][0], y - stroke[i - 1][1]);
    }
  }
  return points <= MAX_SIGNATURE_POINTS && length >= MIN_SIGNATURE_LENGTH && maxX - minX >= MIN_SIGNATURE_WIDTH;
}

/** SVG path data for one stroke; a single point becomes a visible dot. */
export function strokePath(stroke: Signature["strokes"][number]): string {
  const [first, ...rest] = stroke;
  const segments = rest.length > 0 ? rest : [[first[0] + 0.5, first[1]]];
  return `M ${first[0].toFixed(1)} ${first[1].toFixed(1)} ${segments
    .map(([x, y]) => `L ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ")}`;
}

export const acknowledgeRequestSchema = z.object({
  checked: z.array(z.boolean()).max(20),
  signature: signatureSchema,
});
export type AcknowledgeRequest = z.infer<typeof acknowledgeRequestSchema>;

/** Failure codes the confirm endpoint returns; each has a translated message. */
export const ACKNOWLEDGE_ERRORS = [
  "SESSION",
  "NOT_ELIGIBLE",
  "NOT_AVAILABLE",
  "ALREADY",
  "NOT_READ",
  "CHECKLIST",
  "SIGNATURE",
  "DRIVE",
  "SERVER",
] as const;
export type AcknowledgeError = (typeof ACKNOWLEDGE_ERRORS)[number];
