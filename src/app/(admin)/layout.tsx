export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh w-full flex-col md:flex-row">
      <aside className="w-full shrink-0 border-b p-4 md:w-60 md:border-r md:border-b-0">
        <nav className="text-sm font-medium">Admin</nav>
      </aside>
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
