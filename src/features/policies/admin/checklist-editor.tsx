"use client";

import { useFieldArray, type Control, type FieldErrors, type UseFormGetValues, type UseFormRegister } from "react-hook-form";
import { ArrowDown, ArrowUp, Plus, Square, SquareCheck, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MAX_CHECKLIST_ITEMS, splitChecklist, type PacketFormInput } from "../schema";

/** The saved checklist, shown the way tutors will read it. */
export function ChecklistPreview({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2">
      {items.map((item, index) => (
        <li key={index} className="bg-muted/40 flex items-start gap-2.5 rounded-lg border px-3 py-2.5">
          <SquareCheck className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span className="text-muted-foreground w-5 shrink-0 text-sm font-semibold tabular-nums">{index + 1}.</span>
          <span className="min-w-0 flex-1 text-sm leading-relaxed">{item}</span>
        </li>
      ))}
    </ol>
  );
}

/** One field per checklist item, so a long sentence that wraps can never be
 * mistaken for a second item. */
export function ChecklistEditor({
  control,
  register,
  getValues,
  errors,
}: {
  control: Control<PacketFormInput>;
  register: UseFormRegister<PacketFormInput>;
  getValues: UseFormGetValues<PacketFormInput>;
  errors: FieldErrors<PacketFormInput>;
}) {
  const t = useTranslations("admin.policies.form");
  const { fields, append, insert, remove, move, replace } = useFieldArray({ control, name: "checklist" });
  const full = fields.length >= MAX_CHECKLIST_ITEMS;
  const listError = errors.checklist?.root?.message ?? errors.checklist?.message;

  /** Enter starts the next item instead of adding a line break. */
  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>, index: number) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (!full) insert(index + 1, { text: "" });
  }

  /** Pasting a whole list fills one field per line. */
  function handlePaste(event: React.ClipboardEvent<HTMLTextAreaElement>, index: number) {
    const lines = splitChecklist(event.clipboardData.getData("text/plain"));
    if (lines.length < 2) return;
    event.preventDefault();
    const current = getValues("checklist");
    // An empty field is filled; otherwise the new items go right after it.
    const start = current[index]?.text.trim() ? index + 1 : index;
    replace([...current.slice(0, start), ...lines.map((text) => ({ text })), ...current.slice(index + 1)]);
  }

  return (
    <div className="space-y-2">
      <ol className="space-y-2">
        {fields.map((field, index) => {
          const number = index + 1;
          const itemError = errors.checklist?.[index]?.text?.message;
          return (
            <li key={field.id} className="bg-muted/40 rounded-lg border p-2.5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  <Square className="text-muted-foreground mt-2.5 size-4 shrink-0" aria-hidden="true" />
                  <span className="text-muted-foreground mt-2 w-5 shrink-0 text-sm font-semibold tabular-nums">
                    {number}.
                  </span>
                  <Textarea
                    rows={1}
                    className="bg-card min-h-9 flex-1 resize-none"
                    aria-label={t("itemLabel", { number })}
                    aria-invalid={!!itemError}
                    placeholder={t("itemPlaceholder")}
                    onKeyDown={(event) => handleKeyDown(event, index)}
                    onPaste={(event) => handlePaste(event, index)}
                    {...register(`checklist.${index}.text`)}
                  />
                </div>
                <div className="flex justify-end gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                  >
                    <ArrowUp className="size-4" />
                    <span className="sr-only">{t("moveUp", { number })}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={index === fields.length - 1}
                    onClick={() => move(index, index + 1)}
                  >
                    <ArrowDown className="size-4" />
                    <span className="sr-only">{t("moveDown", { number })}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="size-4" />
                    <span className="sr-only">{t("removeItem", { number })}</span>
                  </Button>
                </div>
              </div>
              {itemError && <p className="text-destructive mt-1 text-sm">{itemError}</p>}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="outline" size="sm" disabled={full} onClick={() => append({ text: "" })}>
          <Plus className="size-4" />
          {t("addItem")}
        </Button>
        <span className="text-muted-foreground text-xs tabular-nums">
          {fields.length}/{MAX_CHECKLIST_ITEMS}
        </span>
      </div>
      <p className="text-muted-foreground text-xs">{t("checklistHint")}</p>
      {listError && <p className="text-destructive text-sm">{listError}</p>}
    </div>
  );
}
