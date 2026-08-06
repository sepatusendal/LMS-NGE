import { AppSidebar } from "@/components/shared/app-sidebar";

const ADMIN_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/schools", label: "Sekolah" },
  { href: "/teachers", label: "Teacher" },
  { href: "/students", label: "Siswa" },
  { href: "/classes", label: "Kelas" },
  { href: "/curriculum", label: "Kurikulum" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh w-full flex-col md:flex-row">
      <AppSidebar roleLabel="Admin" navItems={ADMIN_NAV_ITEMS} />
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
