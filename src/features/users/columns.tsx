"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ROLE_LABEL, type AppUser } from "./schema";
import { useSetAppUserActive } from "./use-users";

function ActiveToggleCell({ user }: { user: AppUser }) {
  const setActive = useSetAppUserActive();
  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={user.isActive}
        disabled={setActive.isPending}
        onCheckedChange={(checked) => setActive.mutate({ userId: user.id, isActive: checked })}
      />
      <Badge variant={user.isActive ? "default" : "secondary"}>
        {user.isActive ? "Aktif" : "Nonaktif"}
      </Badge>
    </div>
  );
}

export function createUserColumns(onEdit: (user: AppUser) => void): ColumnDef<AppUser>[] {
  return [
    { accessorKey: "fullName", header: "Nama" },
    { accessorKey: "email", header: "Email" },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <Badge variant="outline">{ROLE_LABEL[row.original.role]}</Badge>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => <ActiveToggleCell user={row.original} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => onEdit(row.original)}>
          Edit
        </Button>
      ),
    },
  ];
}
