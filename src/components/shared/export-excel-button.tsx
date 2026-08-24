"use client";

import { useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadExcel, type ExcelSheet } from "@/lib/export-excel";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySheets = ExcelSheet<any>[];

export function ExportExcelButton({
  filename,
  sheets,
  getSheets,
  disabled,
  label = "Export Excel",
}: {
  filename: string;
  sheets?: AnySheets;
  getSheets?: () => Promise<AnySheets>;
  disabled?: boolean;
  label?: string;
}) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      const resolved = getSheets ? await getSheets() : (sheets ?? []);
      await downloadExcel(filename, resolved);
    } finally {
      setIsExporting(false);
    }
  }

  const isEmpty = !getSheets && (sheets ?? []).every((s) => s.rows.length === 0);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || isExporting || isEmpty}
    >
      {isExporting ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
      {label}
    </Button>
  );
}
