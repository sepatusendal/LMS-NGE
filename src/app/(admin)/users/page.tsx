"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { useAppUsers } from "@/features/users/use-users";
import { createUserColumns } from "@/features/users/columns";
import { UserCreateDialog } from "@/features/users/user-create-dialog";
import { UserEditDialog } from "@/features/users/user-edit-dialog";
import type { AppUser } from "@/features/users/schema";

export default function UsersPage() {
  const t = useTranslations("admin.users");
  const tCommon = useTranslations("common");
  const { data: users, isLoading, isError } = useAppUsers();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | undefined>();

  const columns = useMemo(
    () =>
      createUserColumns(tCommon, (user) => {
        setEditing(user);
        setEditOpen(true);
      }),
    [tCommon],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>{t("addAccount")}</Button>
      </div>

      <DataTable
        columns={columns}
        data={users ?? []}
        isLoading={isLoading}
        isError={isError}
        searchPlaceholder={t("searchPlaceholder")}
      />

      <UserCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
      <UserEditDialog open={editOpen} onOpenChange={setEditOpen} user={editing} />
    </div>
  );
}
