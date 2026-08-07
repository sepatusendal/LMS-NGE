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

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 .3a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.02c-3.34.73-4.04-1.6-4.04-1.6-.55-1.38-1.33-1.75-1.33-1.75-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 12 .3Z" />
    </svg>
  );
}
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

      <a
        href="https://github.com/sepatusendal"
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 pt-2 text-xs transition-colors"
      >
        <span>
          Built with <span aria-hidden="true">♥</span> by
        </span>
        <GithubIcon className="size-3.5" />
        <span className="font-medium">sepatusendal</span>
      </a>
    </div>
  );
}
