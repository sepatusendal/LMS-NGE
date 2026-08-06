import { z } from "zod";

export const schoolSchema = z.object({
  name: z.string().min(1, "Nama sekolah wajib diisi"),
  address: z.string().optional(),
  picName: z.string().optional(),
  picPhone: z.string().optional(),
});

export type SchoolInput = z.infer<typeof schoolSchema>;

export interface School {
  id: string;
  name: string;
  address: string | null;
  picName: string | null;
  picPhone: string | null;
  isActive: boolean;
  createdAt: string;
}
