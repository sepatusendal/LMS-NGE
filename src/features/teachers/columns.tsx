"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/currency";
import type { Teacher } from "./schema";
import { useSetTeacherActive } from "./use-teachers";

function ActiveToggleCell({ teacher }: { teacher: Teacher }) {
  const tCommon = useTranslations("common");
  const setActive = useSetTeacherActive();
  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={teacher.isActive}
        disabled={setActive.isPending}
        onCheckedChange={(checked) =>
          setActive.mutate({ id: teacher.id, userId: teacher.userId, isActive: checked })
        }
      />
      <Badge variant={teacher.isActive ? "default" : "secondary"}>
        {teacher.isActive ? tCommon("active") : tCommon("inactive")}
      </Badge>
    </div>
  );
}

export function createTeacherColumns(
  t: (key: string) => string,
  tCommon: (key: string) => string,
  onEdit: (teacher: Teacher) => void,
): ColumnDef<Teacher>[] {
  return [
    { accessorKey: "fullName", header: tCommon("name") },
    {
      accessorKey: "tutorId",
      header: "Tutor ID",
      cell: ({ row }) => row.original.tutorId || "-",
    },
    { accessorKey: "email", header: "Email" },
    {
      accessorKey: "feePerMeeting",
      header: t("feePerMeetingHeader"),
      cell: ({ row }) =>
        row.original.feePerMeeting != null ? formatRupiah(row.original.feePerMeeting) : "-",
    },
    {
      accessorKey: "phone",
      header: t("phoneHeader"),
      cell: ({ row }) => row.original.phone || "-",
    },
    {
      accessorKey: "isActive",
      header: tCommon("status"),
      cell: ({ row }) => <ActiveToggleCell teacher={row.original} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => onEdit(row.original)}>
          {tCommon("edit")}
        </Button>
      ),
    },
  ];
}
