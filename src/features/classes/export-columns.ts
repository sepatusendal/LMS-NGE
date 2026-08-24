import type { ExcelColumn } from "@/lib/export-excel";
import { formatScheduleSlots, type Class } from "./schema";

export const CLASS_EXPORT_COLUMNS: ExcelColumn<Class>[] = [
  { header: "Nama Kelas", key: "name", width: 22, value: (c) => c.name },
  { header: "Sekolah", key: "school", width: 22, value: (c) => c.schoolName },
  { header: "Tipe Kelas", key: "type", width: 16, value: (c) => (c.classType === "TEACHER_TRAINING" ? "Guru & Staff" : "Reguler") },
  { header: "Teacher", key: "teacher", width: 22, value: (c) => c.teacherName },
  { header: "Kurikulum", key: "curriculum", width: 22, value: (c) => c.curriculumName ?? "-" },
  { header: "Ruang", key: "room", width: 14, value: (c) => c.room ?? "-" },
  { header: "Jadwal", key: "schedule", width: 30, value: (c) => formatScheduleSlots(c.scheduleSlots) },
  { header: "Status", key: "status", width: 12, value: (c) => (c.isActive ? "Aktif" : "Nonaktif") },
  { header: "Dibuat", key: "createdAt", width: 16, value: (c) => new Date(c.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) },
];
