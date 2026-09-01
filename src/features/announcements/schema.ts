import { z } from "zod";
import {
  CelebrationIllustration,
  InfoIllustration,
  MaintenanceIllustration,
  SuccessIllustration,
} from "./illustrations";

export const ANNOUNCEMENT_TYPES = ["INFO", "SUCCESS", "CELEBRATION", "MAINTENANCE"] as const;
export type AnnouncementType = (typeof ANNOUNCEMENT_TYPES)[number];

export const announcementSchema = z.object({
  title: z.string().min(1, "Judul wajib diisi").max(80, "Judul maksimal 80 karakter"),
  body: z.string().min(1, "Isi pengumuman wajib diisi").max(500, "Isi maksimal 500 karakter"),
  type: z.enum(ANNOUNCEMENT_TYPES),
  expiresAt: z.string().nullable(),
});
export type AnnouncementInput = z.infer<typeof announcementSchema>;

export interface Announcement {
  id: string;
  title: string;
  body: string;
  type: AnnouncementType;
  isActive: boolean;
  createdByName: string;
  expiresAt: string | null;
  createdAt: string;
}

interface AnnouncementTheme {
  label: string;
  Illustration: (props: { className?: string }) => React.JSX.Element;
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
    card: "bg-[#4b60ac]/[0.06]",
    border: "border-[#4b60ac]/15",
    iconBg: "bg-[#4b60ac]/10",
    iconColor: "text-[#4b60ac]",
    titleColor: "text-[#1e3a5f]",
    swatch: "#4b60ac",
  },
  SUCCESS: {
    label: "Sukses",
    Illustration: SuccessIllustration,
    card: "bg-[#1baf7a]/[0.06]",
    border: "border-[#1baf7a]/15",
    iconBg: "bg-[#1baf7a]/10",
    iconColor: "text-[#1baf7a]",
    titleColor: "text-[#0f5c3f]",
    swatch: "#1baf7a",
  },
  CELEBRATION: {
    label: "Perayaan",
    Illustration: CelebrationIllustration,
    card: "bg-[#f15c5d]/[0.06]",
    border: "border-[#f15c5d]/15",
    iconBg: "bg-[#f15c5d]/10",
    iconColor: "text-[#f15c5d]",
    titleColor: "text-[#8a2e2f]",
    swatch: "#f15c5d",
  },
  MAINTENANCE: {
    label: "Perbaikan",
    Illustration: MaintenanceIllustration,
    card: "bg-[#eda100]/[0.08]",
    border: "border-[#eda100]/20",
    iconBg: "bg-[#eda100]/15",
    iconColor: "text-[#a3730a]",
    titleColor: "text-[#a3730a]",
    swatch: "#eda100",
  },
};
