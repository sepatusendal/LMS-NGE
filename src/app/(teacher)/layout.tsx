export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-24">{children}</main>
    </div>
  );
}
