"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";

// Everything else in the app speaks Indonesian — these stay English on
// purpose, a small wink while people wait a second or two.
const FUNNY_LOADING_MESSAGES = [
  "Waking up the tutors...",
  "Herding lesson plans into a line...",
  "Bribing the server with coffee...",
  "Counting students (again)...",
  "Untangling today's schedule...",
  "Convincing pixels to cooperate...",
  "Sharpening virtual pencils...",
  "Politely asking the cloud...",
  "Dusting off the gradebook...",
  "Summoning today's classes...",
  "Reorganizing the sticky notes...",
  "Warming up the whiteboard...",
];

export function LoadingState({
  label,
  className = "py-16",
}: {
  label?: string;
  className?: string;
}) {
  const message = useMemo(
    () =>
      label ??
      FUNNY_LOADING_MESSAGES[Math.floor(Math.random() * FUNNY_LOADING_MESSAGES.length)],
    [label],
  );

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <Loader2 className="text-primary size-7 animate-spin" strokeWidth={2.5} />
      <p className="text-muted-foreground text-sm font-medium">{message}</p>
    </div>
  );
}
