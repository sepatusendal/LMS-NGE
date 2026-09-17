"use client";

import { useEffect, useRef, useState } from "react";
import { Columns3 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export function ColumnVisibilityMenu({
  columns,
  visibility,
  onChange,
}: {
  columns: { key: string; label: string }[];
  visibility: Record<string, boolean>;
  onChange: (key: string, visible: boolean) => void;
}) {
  const t = useTranslations("common.columnVisibility");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
        <Columns3 className="size-4" />
        {t("columns")}
      </Button>
      {open && (
        <div className="absolute right-0 z-20 mt-1.5 max-h-72 w-56 overflow-y-auto rounded-lg border bg-popover p-2 text-popover-foreground shadow-md">
          {columns.map((col) => {
            const isVisible = visibility[col.key] !== false;
            return (
              <label
                key={col.key}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                <Checkbox
                  checked={isVisible}
                  onCheckedChange={(checked) => onChange(col.key, checked === true)}
                />
                <span className="truncate">{col.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
