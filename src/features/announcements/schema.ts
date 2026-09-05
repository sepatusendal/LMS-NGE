import { z } from "zod";
import {
  CelebrationIllustration,
  InfoIllustration,
  MaintenanceIllustration,
  SuccessIllustration,
} from "./illustrations";

export const ANNOUNCEMENT_TYPES = ["INFO", "SUCCESS", "CELEBRATION", "MAINTENANCE"] as const;
export type AnnouncementType = (typeof ANNOUNCEMENT_TYPES)[number];

export const ANNOUNCEMENT_DISPLAY_MODES = ["BANNER", "POPUP"] as const;
export type AnnouncementDisplayMode = (typeof ANNOUNCEMENT_DISPLAY_MODES)[number];

// Mirrors the Prisma `Role` enum (prisma/schema.prisma) — kept as a local
// literal list rather than importing the generated enum since this schema
// is also used client-side.
export const ANNOUNCEMENT_TARGET_ROLES = ["ADMIN", "COORDINATOR", "TEACHER"] as const;
export type AnnouncementTargetRole = (typeof ANNOUNCEMENT_TARGET_ROLES)[number];

export const TARGET_ROLE_LABEL: Record<AnnouncementTargetRole, string> = {
  ADMIN: "Admin",
  COORDINATOR: "Koordinator",
  TEACHER: "Tutor",
};

/** Build translated target-role labels. Pass a t scoped to
 * "admin.announcements". */
export function buildTargetRoleLabel(
  t: (key: string) => string,
): Record<AnnouncementTargetRole, string> {
  return {
    ADMIN: t("roleAdmin"),
    COORDINATOR: t("roleCoordinator"),
    TEACHER: t("roleTeacher"),
  };
}

export function buildAnnouncementSchema(t: (key: string) => string) {
  return z.object({
    title: z.string().min(1, t("validation.titleRequired")).max(80, t("validation.titleMax")),
    body: z.string().min(1, t("validation.bodyRequired")).max(500, t("validation.bodyMax")),
    type: z.enum(ANNOUNCEMENT_TYPES),
    displayMode: z.enum(ANNOUNCEMENT_DISPLAY_MODES),
    expiresAt: z.string().nullable(),
    // Empty = visible to every role (backward compatible default).
    targetRoles: z.array(z.enum(ANNOUNCEMENT_TARGET_ROLES)),
  });
}
export type AnnouncementInput = z.infer<ReturnType<typeof buildAnnouncementSchema>>;

export interface Announcement {
  id: string;
  title: string;
  body: string;
  type: AnnouncementType;
  displayMode: AnnouncementDisplayMode;
  isActive: boolean;
  createdByName: string;
  expiresAt: string | null;
  createdAt: string;
  targetRoles: AnnouncementTargetRole[];
}

export const DISPLAY_MODE_INFO: Record<AnnouncementDisplayMode, { label: string; description: string }> = {
  BANNER: {
    label: "Banner",
    description: "Kartu di dashboard, gak mengganggu — bisa dilihat kapan saja.",
  },
  POPUP: {
    label: "Pop-up",
    description: "Jendela yang langsung muncul saat dibuka — buat info penting yang wajib dibaca.",
  },
};

/** Build translated display-mode info. Pass a t scoped to
 * "admin.announcements". */
export function buildDisplayModeInfo(
  t: (key: string) => string,
): Record<AnnouncementDisplayMode, { label: string; description: string }> {
  return {
    BANNER: { label: "Banner", description: t("displayModeBannerDescription") },
    POPUP: { label: "Pop-up", description: t("displayModePopupDescription") },
  };
}

interface AnnouncementTheme {
  label: string;
  Illustration: (props: { className?: string; uid?: string }) => React.JSX.Element;
  /** Soft tinted card background/border, matching the existing
   * `bg-[color]/10 border-[color]/20` pattern used for the lesson-plan
   * due banner on the teacher dashboard. */
  card: string;
  border: string;
  iconBg: string;
  iconColor: string;
  titleColor: string;
  /** Accent used for the type-picker swatch in the admin form. */
  swatch: string;
}

export const ANNOUNCEMENT_THEME: Record<AnnouncementType, AnnouncementTheme> = {
  INFO: {
    label: "Info",
    Illustration: InfoIllustration,
    card: "bg-primary/[0.06]",
    border: "border-primary/15",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    titleColor: "text-foreground",
    swatch: "var(--brand-blue)",
  },
  SUCCESS: {
    label: "Sukses",
    Illustration: SuccessIllustration,
    card: "bg-chart-3/[0.06]",
    border: "border-chart-3/15",
    iconBg: "bg-chart-3/10",
    iconColor: "text-chart-3",
    titleColor: "text-foreground",
    swatch: "var(--chart-3)",
  },
  CELEBRATION: {
    label: "Perayaan",
    Illustration: CelebrationIllustration,
    card: "bg-destructive/[0.06]",
    border: "border-destructive/15",
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    titleColor: "text-foreground",
    swatch: "var(--brand-coral)",
  },
  MAINTENANCE: {
    label: "Perbaikan",
    Illustration: MaintenanceIllustration,
    card: "bg-chart-4/[0.08]",
    border: "border-chart-4/20",
    iconBg: "bg-chart-4/15",
    iconColor: "text-chart-4",
    titleColor: "text-foreground",
    swatch: "var(--chart-4)",
  },
};

/** Build translated theme labels (Info/Success/Celebration/Maintenance),
 * for the admin list page's type badge. Pass a t scoped to
 * "admin.announcements". */
export function buildThemeLabel(t: (key: string) => string): Record<AnnouncementType, string> {
  return {
    INFO: t("typeInfo"),
    SUCCESS: t("typeSuccess"),
    CELEBRATION: t("typeCelebration"),
    MAINTENANCE: t("typeMaintenance"),
  };
}
