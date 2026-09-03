"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { useAppUsers } from "@/features/users/use-users";
import { createUserColumns } from "@/features/users/columns";
import { UserCreateDialog } from "@/features/users/user-create-dialog";
import { UserEditDialog } from "@/features/users/user-edit-dialog";
import type { AppUser } from "@/features/users/schema";

export default function UsersPage() {
  const { data: users, isLoading, isError } = useAppUsers();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | undefined>();

  const columns = useMemo(
    () =>
      createUserColumns((user) => {
        setEditing(user);
        setEditOpen(true);
      }),
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Admin & Coordinator</h1>
          <p className="text-muted-foreground text-sm">
            Kelola akun Admin dan Coordinator NUFA.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Tambah Akun</Button>
      </div>

      <DataTable
        columns={columns}
        data={users ?? []}
        isLoading={isLoading}
        isError={isError}
        searchPlaceholder="Cari akun..."
      />

      <UserCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
      <UserEditDialog open={editOpen} onOpenChange={setEditOpen} user={editing} />
    </div>
  );
}
