"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useCurrentUser } from "@/features/auth/use-current-user";
import type { AppRole } from "@/features/auth/role-routes";
import { useCurrentTeacher } from "@/features/teachers/use-current-teacher";
import { ConfirmPolicyError, type MyPolicy } from "./queries";
import { ACKNOWLEDGE_ERRORS, ROLE_NAMES, type Signature } from "./schema";
import { SignaturePad } from "./signature-pad";
import { useConfirmPolicy } from "./use-policies";

async function signOutAndReload() {
  await createClient().auth.signOut();
  // A full reload drops everything cached for the previous account.
  window.location.assign("/login");
}

/** Checklist, identity, signature and the confirm button. */
export function ConfirmPanel({ policy }: { policy: MyPolicy }) {
  const t = useTranslations("policies.confirm");
  const { data: user } = useCurrentUser();
  const isTutor = user?.role === "TEACHER";
  const { data: teacher } = useCurrentTeacher(isTutor);
  const confirm = useConfirmPolicy(policy.packet.id);
  const items = policy.packet.checklistItems;
  const [checked, setChecked] = useState<boolean[]>(() => items.map(() => false));
  const [signature, setSignature] = useState<Signature | null>(null);
  const allRead = policy.documents.length > 0 && policy.documents.every((d) => d.completed);
  const allChecked = checked.length === items.length && checked.every(Boolean);
  const identified = Boolean(user) && (!isTutor || Boolean(teacher));
  const ready = allRead && allChecked && signature !== null && identified;

  const errorCode =
    confirm.error instanceof ConfirmPolicyError && ACKNOWLEDGE_ERRORS.includes(confirm.error.code)
      ? confirm.error.code
      : confirm.error
        ? "SERVER"
        : null;

  return (
    <Card>
      <CardContent className="space-y-5">
        <section className="space-y-3">
          <h2 className="text-base font-semibold">{t("checklistTitle")}</h2>
          {!allRead && (
            <p className="bg-chart-4/10 text-chart-4 rounded-md px-3 py-2 text-xs font-medium">{t("lockedHint")}</p>
          )}
          <ul className="space-y-3">
            {items.map((item, index) => (
              <li key={index}>
                <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed has-disabled:cursor-not-allowed has-disabled:opacity-60">
                  <Checkbox
                    className="mt-0.5 size-5"
                    disabled={!allRead || confirm.isPending}
                    checked={checked[index] ?? false}
                    onCheckedChange={(value) =>
                      setChecked((current) => items.map((_, i) => (i === index ? value === true : (current[i] ?? false))))
                    }
                  />
                  <span>{item}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-1">
          <h2 className="text-sm font-semibold">{t("statementTitle")}</h2>
          <p className="bg-muted rounded-lg px-3 py-2.5 text-sm leading-relaxed">{policy.packet.statement}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">{t("signTitle")}</h2>
          <div className="rounded-lg border px-3 py-2.5">
            <p className="text-muted-foreground text-xs">{t("identityTitle")}</p>
            <p className="text-sm font-semibold">{user?.fullName ?? "..."}</p>
            <p className="text-muted-foreground text-xs">
              {!user
                ? "..."
                : isTutor
                  ? t("tutorId", { id: teacher?.tutorId || "-" })
                  : t("roleLine", { role: ROLE_NAMES[user.role as AppRole] })}
            </p>
            <button type="button" className="text-primary mt-1 text-xs font-medium underline" onClick={signOutAndReload}>
              {t("notYou")}
            </button>
          </div>
          {!allChecked && <p className="text-muted-foreground text-xs">{t("signLocked")}</p>}
          <SignaturePad disabled={!allRead || !allChecked || confirm.isPending} onChange={setSignature} />
        </section>

        {errorCode && (
          <p role="alert" className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
            {t(`errors.${errorCode}`)}
          </p>
        )}

        <Button
          size="lg"
          className="h-11 w-full"
          disabled={!ready || confirm.isPending}
          onClick={() => signature && confirm.mutate({ checked, signature })}
        >
          {confirm.isPending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
          {confirm.isPending ? t("submitting") : t("submit")}
        </Button>
      </CardContent>
    </Card>
  );
}
