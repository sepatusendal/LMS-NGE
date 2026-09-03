"use client";

import { RouteError } from "@/components/shared/route-error";

export default function TeacherError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError reset={reset} />;
}
