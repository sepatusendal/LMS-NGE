"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shared presentational body for every route group's `error.tsx` boundary —
 * keeps the fallback UI consistent across (admin)/(teacher)/(coordinator)/(auth)
 * without duplicating markup in each one. */
export function RouteError({
  reset,
  message = "Terjadi kesalahan. Coba lagi.",
}: {
  reset: () => void;
  message?: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <AlertTriangle className="text-destructive size-8" />
      <p className="text-muted-foreground text-sm">{message}</p>
      <Button onClick={reset} variant="outline" size="sm">
        <RotateCw className="size-4" />
        Coba Lagi
      </Button>
    </div>
  );
}
