import { AppSidebar } from "@/components/shared/app-sidebar";

const COORDINATOR_NAV_ITEMS = [{ href: "/monitoring", label: "Monitoring" }];

export default function CoordinatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh w-full flex-col md:flex-row">
      <AppSidebar roleLabel="Coordinator" navItems={COORDINATOR_NAV_ITEMS} />
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
