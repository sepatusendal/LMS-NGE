"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buildPacketFormSchema, DEFAULT_CHECKLIST, DEFAULT_STATEMENT, type PacketFormInput, type PolicyPacket } from "../schema";
import { ChecklistEditor, ChecklistPreview } from "./checklist-editor";

export function packetToFormValues(packet?: PolicyPacket): PacketFormInput {
  return {
    title: packet?.title ?? "",
    checklist: (packet?.checklistItems ?? DEFAULT_CHECKLIST).map((text) => ({ text })),
    statement: packet?.statement ?? DEFAULT_STATEMENT,
    deadline: packet?.deadline ?? "",
    hrContactName: packet?.hrContactName ?? "",
    hrWhatsapp: packet?.hrWhatsapp ?? "",
    hrEmail: packet?.hrEmail ?? "",
  };
}

/** Create and edit form. Once published, only the deadline and HR contact can
 * change; the rest is shown read-only. */
export function PacketForm({
  packet,
  submitLabel,
  isPending,
  onSubmit,
}: {
  packet?: PolicyPacket;
  submitLabel: string;
  isPending: boolean;
  onSubmit: (values: PacketFormInput) => void;
}) {
  const t = useTranslations("admin.policies.form");
  const schema = useMemo(() => buildPacketFormSchema(t), [t]);
  const wordingLocked = Boolean(packet) && packet!.status !== "DRAFT";
  const readOnlyAll = packet?.status === "ARCHIVED";
  const values = useMemo(() => packetToFormValues(packet), [packet]);
  const {
    register,
    control,
    getValues,
    handleSubmit,
    formState: { errors },
  } = useForm<PacketFormInput>({ resolver: zodResolver(schema), values });

  const message = (text?: string) => (text ? <p className="text-destructive text-sm">{text}</p> : null);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {wordingLocked && <p className="bg-muted text-muted-foreground rounded-md px-3 py-2 text-xs">{t("lockedHint")}</p>}

      <div className="space-y-2">
        <Label htmlFor="policy-title">{t("title")}</Label>
        <Input
          id="policy-title"
          placeholder={t("titlePlaceholder")}
          readOnly={wordingLocked}
          aria-invalid={!!errors.title}
          {...register("title")}
        />
        {message(errors.title?.message)}
      </div>

      <div className="space-y-2">
        <p className="text-sm leading-none font-medium">{t("checklist")}</p>
        {wordingLocked ? (
          <ChecklistPreview items={packet!.checklistItems} />
        ) : (
          <ChecklistEditor control={control} register={register} getValues={getValues} errors={errors} />
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="policy-statement">{t("statement")}</Label>
        <Textarea
          id="policy-statement"
          rows={3}
          readOnly={wordingLocked}
          aria-invalid={!!errors.statement}
          {...register("statement")}
        />
        {message(errors.statement?.message)}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="policy-deadline">{t("deadline")}</Label>
          <Input id="policy-deadline" type="date" readOnly={readOnlyAll} {...register("deadline")} />
          <p className="text-muted-foreground text-xs">{t("deadlineHint")}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="policy-hr-name">{t("hrContactName")}</Label>
          <Input id="policy-hr-name" readOnly={readOnlyAll} {...register("hrContactName")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="policy-hr-whatsapp">{t("hrWhatsapp")}</Label>
          <Input
            id="policy-hr-whatsapp"
            inputMode="tel"
            placeholder="0812xxxxxxx"
            readOnly={readOnlyAll}
            aria-invalid={!!errors.hrWhatsapp}
            {...register("hrWhatsapp")}
          />
          {message(errors.hrWhatsapp?.message)}
        </div>
        <div className="space-y-2">
          <Label htmlFor="policy-hr-email">{t("hrEmail")}</Label>
          <Input
            id="policy-hr-email"
            inputMode="email"
            readOnly={readOnlyAll}
            aria-invalid={!!errors.hrEmail}
            {...register("hrEmail")}
          />
          {message(errors.hrEmail?.message)}
        </div>
      </div>

      {!readOnlyAll && (
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
}
