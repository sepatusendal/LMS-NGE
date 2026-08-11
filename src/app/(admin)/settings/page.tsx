"use client";

import Link from "next/link";
import {
  Building2,
  GraduationCap,
  Users,
  BookOpen,
  ListChecks,
  CalendarDays,
  ShieldUser,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const QUICK_LINKS = [
  {
    href: "/schools",
    label: "Kelola Sekolah",
    description: "Tambah, edit, atau nonaktifkan sekolah mitra.",
    icon: Building2,
  },
  {
    href: "/teachers",
    label: "Kelola Teacher",
    description: "Buat akun teacher, atur data, dan status aktif.",
    icon: GraduationCap,
  },
  {
    href: "/users",
    label: "Admin & Coordinator",
    description: "Buat akun Admin/Coordinator, reset password, dan status aktif.",
    icon: ShieldUser,
  },
  {
    href: "/students",
    label: "Kelola Siswa",
    description: "Daftar siswa per sekolah lengkap dengan NIS.",
    icon: Users,
  },
  {
    href: "/classes",
    label: "Kelola Kelas",
    description: "Buat kelas, atur jadwal, roster, dan teacher.",
    icon: BookOpen,
  },
  {
    href: "/curriculum",
    label: "Kelola Kurikulum",
    description: "Atur level dan deskripsi kurikulum per kelas.",
    icon: ListChecks,
  },
  {
    href: "/lesson-plans",
    label: "Lesson Plan",
    description: "Lihat lesson plan teacher per sekolah.",
    icon: CalendarDays,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Pengaturan</h1>
        <p className="text-muted-foreground text-sm">
          Pusat kontrol untuk mengelola seluruh data Portal NUFA.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href}>
              <Card className="hover:bg-muted/50 h-full transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Icon className="text-primary size-4" />
                    {link.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-xs">
                    {link.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
