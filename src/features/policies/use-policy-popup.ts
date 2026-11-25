import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AppRole } from "@/features/auth/role-routes";
import { applyPopupEvent, decidePopup, isPopupPage, parsePopupSettings, type PopupEvent } from "./popup-rules";
import { markShownThisOpen, touchSession, wasShownThisOpen, watchPolicySession } from "./popup-session";
import { recordPopup, type MyPolicies, type MyPolicy } from "./queries";
import { MY_POLICIES_KEY } from "./use-policies";

export interface ActivePopup {
  item: MyPolicy;
  /** No "later" button. */
  firm: boolean;
}

/** Decides when the pop-up opens. It looks again only at real moments: a page
 * change, the list of waiting documents changing, or the app being reopened, so
 * an open pop-up is never closed by its own history being recorded. */
export function usePolicyPopup({
  pending,
  role,
  pathname,
  sessionKey,
}: {
  pending: MyPolicy[];
  role: AppRole | undefined;
  pathname: string;
  sessionKey: string;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<{ packetId: string; firm: boolean } | null>(null);
  const [reopens, setReopens] = useState(0);
  const handled = useRef("");
  const pendingKey = pending.map((item) => item.packet.id).join(",");

  useEffect(() => {
    if (!sessionKey) return;
    return watchPolicySession(sessionKey, () => setReopens((n) => n + 1));
  }, [sessionKey]);

  const record = useCallback(
    (packetId: string, event: PopupEvent) => {
      const now = new Date();
      const sessionId = touchSession(sessionKey, now.getTime());
      // Update our copy first so the very next page already sees it.
      queryClient.setQueryData<MyPolicies>(MY_POLICIES_KEY, (data) =>
        data && {
          ...data,
          items: data.items.map((item) =>
            item.packet.id === packetId
              ? { ...item, popup: applyPopupEvent(item.popup, event, now, sessionId) }
              : item,
          ),
        },
      );
      // A lost record only means one extra reminder.
      recordPopup(packetId, event, sessionId).catch(() => {});
    },
    [queryClient, sessionKey],
  );

  const fits = (item: MyPolicy) =>
    Boolean(role) && isPopupPage(pathname, parsePopupSettings(item.packet.popupSettings), role as AppRole);
  const current = open ? pending.find((item) => item.packet.id === open.packetId && fits(item)) : undefined;

  useEffect(() => {
    if (!role || !sessionKey || !pendingKey) return;
    const moment = `${pathname}|${pendingKey}|${reopens}`;
    if (handled.current === moment) return;
    handled.current = moment;
    // Leave the one on screen alone.
    if (current) return;

    const now = new Date();
    const sessionId = touchSession(sessionKey, now.getTime());
    for (const item of pending) {
      const settings = parsePopupSettings(item.packet.popupSettings);
      if (!isPopupPage(pathname, settings, role)) continue;
      const decision = decidePopup(settings, item.popup, {
        now,
        sessionId,
        shownThisOpen: wasShownThisOpen(sessionKey, item.packet.id),
        role,
      });
      if (decision === "NONE") continue;
      markShownThisOpen(sessionKey, item.packet.id);
      setOpen({ packetId: item.packet.id, firm: decision === "FIRM" });
      record(item.packet.id, "SHOWN");
      return;
    }
    setOpen(null);
  }, [role, sessionKey, pendingKey, pathname, reopens, pending, current, record]);

  const popup: ActivePopup | null = current && open ? { item: current, firm: open.firm } : null;

  return {
    popup,
    /** "Later": counts against the allowed uses. */
    later: () => {
      if (!open) return;
      record(open.packetId, "SNOOZED");
      setOpen(null);
    },
    /** Went to read or to attendance, which is not a "later". */
    close: () => setOpen(null),
  };
}
