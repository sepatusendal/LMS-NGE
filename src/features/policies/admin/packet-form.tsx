"use client";

import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  buildPacketFormSchema,
  DEFAULT_CHECKLIST,
  DEFAULT_STATEMENT,
  MAX_NOTICE_MESSAGE_LENGTH,
  MAX_NOTICE_TITLE_LENGTH,
  type PacketFormInput,
  type PolicyPacket,
} from "../schema";
import { DEFAULT_AUDIENCE, toAudienceForm, type PolicyAudience } from "../audience";
import { parsePopupSettings } from "../popup-rules";
import { AudienceEditor } from "./audience-editor";
import { ChecklistEditor, ChecklistPreview } from "./checklist-editor";
import { PopupSettingsEditor } from "./popup-settings-editor";

export function packetToFormValues(packet?: PolicyPacket, audience: PolicyAudience = DEFAULT_AUDIENCE): PacketFormInput {
  return {
    audience: toAudienceForm(audience),
    popup: parsePopupSettings(packet?.popupSettings),
    title: packet?.title ?? "",
    checklist: (packet?.checklistItems ?? DEFAULT_CHECKLIST).map((text) => ({ text })),
    statement: packet?.statement ?? DEFAULT_STATEMENT,
    deadline: packet?.deadline ?? "",
    hrContactName: packet?.hrContactName ?? "",
    hrWhatsapp: packet?.hrWhatsapp ?? "",
    hrEmail: packet?.hrEmail ?? "",
    noticeTitle: packet?.noticeTitle ?? "",
    noticeMessage: packet?.noticeMessage ?? "",
  };
}

/** Create and edit form. Once published, the title, checklist and statement are
 * read-only; the recipients and every reminder setting can still change. */
export function PacketForm({
  packet,
  audience,
  submitLabel,
  isPending,
  onSubmit,
}: {
  packet?: PolicyPacket;
  audience?: PolicyAudience;
  submitLabel: string;
  isPending: boolean;
  onSubmit: (values: PacketFormInput) => void;
}) {
  const t = useTranslations("admin.policies.form");
  // The placeholders show the exact default text tutors see.
  const tNotice = useTranslations("policies.notices");
  const schema = useMemo(() => buildPacketFormSchema(t), [t]);
  const wordingLocked = Boolean(packet) && packet!.status !== "DRAFT";
  const readOnlyAll = packet?.status === "ARCHIVED";
  const values = useMemo(() => packetToFormValues(packet, audience), [packet, audience]);
  const {
    register,
    control,
    getValues,
    handleSubmit,
    watch,
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

      <fieldset className="space-y-3 rounded-lg border p-3">
        <legend className="px-1 text-sm font-medium">{t("audience.heading")}</legend>
        <p className="text-muted-foreground text-xs">{t("audience.hint")}</p>
        <Controller
          control={control}
          name="audience"
          render={({ field }) => (
            <AudienceEditor value={field.value} onChange={field.onChange} disabled={readOnlyAll} />
          )}
        />
        {message(errors.audience?.message)}
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border p-3">
        <legend className="px-1 text-sm font-medium">{t("popup.heading")}</legend>
        <p className="text-muted-foreground text-xs">{t("popup.hint")}</p>
        <Controller
          control={control}
          name="popup"
          render={({ field }) => (
            <PopupSettingsEditor value={field.value} onChange={field.onChange} disabled={readOnlyAll} />
          )}
        />
        {message(errors.popup ? t("validation.popupInvalid") : undefined)}
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border p-3">
        <legend className="px-1 text-sm font-medium">{t("noticeHeading")}</legend>
        <p className="text-muted-foreground text-xs">{t("noticeHint")}</p>
        <div className="space-y-2">
          <Label htmlFor="policy-notice-title">{t("noticeTitle")}</Label>
          <Input
            id="policy-notice-title"
            maxLength={MAX_NOTICE_TITLE_LENGTH}
            placeholder={tNotice("title")}
            readOnly={readOnlyAll}
            aria-invalid={!!errors.noticeTitle}
            {...register("noticeTitle")}
          />
          {message(errors.noticeTitle?.message)}
        </div>
        <div className="space-y-2">
          <Label htmlFor="policy-notice-message">{t("noticeMessage")}</Label>
          <Textarea
            id="policy-notice-message"
            rows={3}
            maxLength={MAX_NOTICE_MESSAGE_LENGTH}
            placeholder={tNotice("popupBody", { title: watch("title") || t("title") })}
            readOnly={readOnlyAll}
            aria-invalid={!!errors.noticeMessage}
            {...register("noticeMessage")}
          />
          <p className="text-muted-foreground text-right text-xs tabular-nums">
            {(watch("noticeMessage") ?? "").length}/{MAX_NOTICE_MESSAGE_LENGTH}
          </p>
          {message(errors.noticeMessage?.message)}
        </div>
      </fieldset>

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
