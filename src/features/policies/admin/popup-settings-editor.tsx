"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AFTER_SNOOZES,
  POPUP_FREQUENCIES,
  POPUP_PAGES,
  POPUP_PRESETS,
  PRESET_SETTINGS,
  presetOf,
  type PopupSettings,
} from "../popup-rules";

const SELECT_CLASS =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-3 disabled:opacity-60";

/** Ready-made intensity levels, or every setting by hand. */
export function PopupSettingsEditor({
  value,
  onChange,
  disabled,
}: {
  value: PopupSettings;
  onChange: (value: PopupSettings) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("admin.policies.form.popup");
  const [custom, setCustom] = useState(() => presetOf(value) === "CUSTOM");
  const active = custom ? "CUSTOM" : presetOf(value);
  const set = (changes: Partial<PopupSettings>) => onChange({ ...value, ...changes });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("heading")}>
        {[...POPUP_PRESETS, "CUSTOM" as const].map((preset) => (
          <Button
            key={preset}
            type="button"
            size="sm"
            variant={active === preset ? "default" : "outline"}
            aria-pressed={active === preset}
            disabled={disabled}
            onClick={() => {
              setCustom(preset === "CUSTOM");
              if (preset !== "CUSTOM") onChange(PRESET_SETTINGS[preset]);
            }}
          >
            {t(`preset.${preset}`)}
          </Button>
        ))}
      </div>

      <PopupSummary settings={value} />

      {(custom || active === "CUSTOM") && (
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            id="popup-frequency"
            label={t("frequencyLabel")}
            disabled={disabled}
            value={value.frequency}
            options={POPUP_FREQUENCIES.map((option) => [option, t(`frequency.${option}`)])}
            onChange={(frequency) => set({ frequency: frequency as PopupSettings["frequency"] })}
          />
          {value.frequency === "INTERVAL" && (
            <NumberField
              id="popup-interval"
              label={t("intervalHours")}
              min={1}
              max={168}
              disabled={disabled}
              value={value.intervalHours}
              onChange={(v) => set({ intervalHours: v ?? Number.NaN })}
            />
          )}
          <SelectField
            id="popup-pages"
            label={t("pagesLabel")}
            disabled={disabled}
            value={value.pages}
            options={POPUP_PAGES.map((option) => [option, t(`pages.${option}`)])}
            onChange={(pages) => set({ pages: pages as PopupSettings["pages"] })}
          />
          <NumberField
            id="popup-gap"
            label={t("minGapMinutes")}
            min={0}
            max={1440}
            disabled={disabled}
            value={value.minGapMinutes}
            onChange={(v) => set({ minGapMinutes: v ?? Number.NaN })}
          />
          <NumberField
            id="popup-per-day"
            label={t("maxPerDay")}
            placeholder={t("noLimit")}
            min={1}
            max={50}
            disabled={disabled}
            value={value.maxPerDay}
            onChange={(maxPerDay) => set({ maxPerDay })}
          />
          <NumberField
            id="popup-total"
            label={t("maxTotal")}
            placeholder={t("noLimit")}
            min={1}
            max={500}
            disabled={disabled}
            value={value.maxTotal}
            onChange={(maxTotal) => set({ maxTotal })}
          />
          <NumberField
            id="popup-snoozes"
            label={t("maxSnoozes")}
            placeholder={t("noLimit")}
            min={0}
            max={50}
            disabled={disabled}
            value={value.maxSnoozes}
            onChange={(maxSnoozes) => set({ maxSnoozes })}
          />
          {value.maxSnoozes !== null && (
            <SelectField
              id="popup-after"
              label={t("afterSnoozesLabel")}
              disabled={disabled}
              value={value.afterSnoozes}
              options={AFTER_SNOOZES.map((option) => [option, t(`afterSnoozes.${option}`)])}
              onChange={(after) => set({ afterSnoozes: after as PopupSettings["afterSnoozes"] })}
            />
          )}
        </div>
      )}

      <p className="text-muted-foreground text-xs">{t("rules")}</p>
    </div>
  );
}

/** The settings as one plain sentence per limit, so a preset is not a mystery. */
function PopupSummary({ settings }: { settings: PopupSettings }) {
  const t = useTranslations("admin.policies.form.popup.summary");
  const parts = [
    `${t(`frequency.${settings.frequency}`, { hours: settings.intervalHours || 0 })} ${t(`pages.${settings.pages}`)}`,
    settings.minGapMinutes > 0 ? t("gap", { minutes: settings.minGapMinutes }) : null,
    settings.maxPerDay !== null ? t("perDay", { count: settings.maxPerDay }) : null,
    settings.maxTotal !== null ? t("total", { count: settings.maxTotal }) : null,
    settings.maxSnoozes !== null ? t(`snoozes.${settings.afterSnoozes}`, { count: settings.maxSnoozes }) : null,
  ].filter(Boolean);

  return (
    <ul className="bg-muted list-disc space-y-0.5 rounded-md py-2 pr-3 pl-7 text-xs" aria-live="polite">
      {parts.map((part) => (
        <li key={part}>{part}</li>
      ))}
    </ul>
  );
}

function SelectField({
  id,
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: [string, string][];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select id={id} className={SELECT_CLASS} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        {options.map(([option, text]) => (
          <option key={option} value={option}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  min,
  max,
  placeholder,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: number | null;
  min: number;
  max: number;
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: number | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        placeholder={placeholder}
        readOnly={disabled}
        value={value === null || Number.isNaN(value) ? "" : value}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    </div>
  );
}
