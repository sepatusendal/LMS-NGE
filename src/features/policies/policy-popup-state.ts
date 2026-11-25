import { useSyncExternalStore } from "react";

// Lets the announcement pop-up step aside while the policy pop-up is showing,
// so a tutor never gets two stacked dialogs.
let open = false;
const listeners = new Set<() => void>();

export function setPolicyPopupOpen(value: boolean) {
  if (open === value) return;
  open = value;
  listeners.forEach((listener) => listener());
}

export function usePolicyPopupOpen(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => open,
    () => false,
  );
}
