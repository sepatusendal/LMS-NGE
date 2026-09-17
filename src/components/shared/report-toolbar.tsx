"use client";

import { ColumnVisibilityMenu } from "@/components/shared/column-visibility-menu";
import { ExportExcelButton } from "@/components/shared/export-excel-button";
import type { ExcelSheet } from "@/lib/export-excel";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySheets = ExcelSheet<any>[];

interface ReportToolbarProps {
  columns: { key: string; label: string }[];
  visibility: Record<string, boolean>;
  onVisibilityChange: (key: string, visible: boolean) => void;
  filename: string;
  sheets: AnySheets;
}

export function ReportToolbar({ columns, visibility, onVisibilityChange, filename, sheets }: ReportToolbarProps) {
  return (
    <div className="flex items-center justify-end gap-2">
      <ColumnVisibilityMenu columns={columns} visibility={visibility} onChange={onVisibilityChange} />
      <ExportExcelButton filename={filename} sheets={sheets} />
    </div>
  );
}
