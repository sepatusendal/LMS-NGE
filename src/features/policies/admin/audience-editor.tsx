"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  AUDIENCE_MODES,
  AUDIENCE_ROLES,
  fromAudienceForm,
  pickRecipients,
  type AudienceFormValue,
  type AudiencePerson,
} from "../audience";
import { useAudiencePeople } from "../use-policies";

const MAX_MATCHES = 8;

/** Who has to receive the packet: every role, chosen roles, or chosen people,
 * with exceptions for the first two. */
export function AudienceEditor({
  value,
  onChange,
  disabled,
}: {
  value: AudienceFormValue;
  onChange: (value: AudienceFormValue) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("admin.policies.form.audience");
  const { data: people, isError } = useAudiencePeople();
  const recipients = people ? pickRecipients(fromAudienceForm(value), people) : null;
  const countOf = (role: string) => recipients?.filter((p) => p.role === role).length ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("heading")}>
        {AUDIENCE_MODES.map((mode) => (
          <Button
            key={mode}
            type="button"
            size="sm"
            variant={value.mode === mode ? "default" : "outline"}
            aria-pressed={value.mode === mode}
            disabled={disabled}
            onClick={() => onChange({ ...value, mode })}
          >
            {t(`mode.${mode}`)}
          </Button>
        ))}
      </div>

      {value.mode === "ROLES" && (
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {AUDIENCE_ROLES.map((role) => (
            <label key={role} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                disabled={disabled}
                checked={value.roles.includes(role)}
                onCheckedChange={(checked) =>
                  onChange({
                    ...value,
                    roles: AUDIENCE_ROLES.filter((r) => (r === role ? checked === true : value.roles.includes(r))),
                  })
                }
              />
              {t(`role.${role}`)}
            </label>
          ))}
        </div>
      )}

      {value.mode === "PEOPLE" ? (
        <PersonPicker
          label={t("included")}
          people={people ?? []}
          selected={value.includedUserIds}
          disabled={disabled}
          onChange={(includedUserIds) => onChange({ ...value, includedUserIds })}
        />
      ) : (
        <PersonPicker
          label={t("excluded")}
          people={(people ?? []).filter((p) => value.mode === "ALL" || value.roles.includes(p.role))}
          allPeople={people ?? []}
          selected={value.excludedUserIds}
          disabled={disabled}
          onChange={(excludedUserIds) => onChange({ ...value, excludedUserIds })}
        />
      )}

      <p className="bg-muted rounded-md px-3 py-2 text-xs font-medium" aria-live="polite">
        {isError
          ? t("loadError")
          : recipients === null
            ? t("counting")
            : t("preview", {
                total: recipients.length,
                tutors: countOf("TEACHER"),
                coordinators: countOf("COORDINATOR"),
                admins: countOf("ADMIN"),
              })}
      </p>
    </div>
  );
}

function PersonPicker({
  label,
  people,
  allPeople = people,
  selected,
  disabled,
  onChange,
}: {
  label: string;
  /** Who can be added. */
  people: AudiencePerson[];
  /** Used to name the people already selected. */
  allPeople?: AudiencePerson[];
  selected: string[];
  disabled?: boolean;
  onChange: (ids: string[]) => void;
}) {
  const t = useTranslations("admin.policies.form.audience");
  const [search, setSearch] = useState("");
  const needle = search.trim().toLowerCase();
  const chosen = new Set(selected);
  const matches = needle
    ? people
        .filter(
          (p) => !chosen.has(p.userId) && `${p.fullName} ${p.email} ${p.tutorId ?? ""}`.toLowerCase().includes(needle),
        )
        .slice(0, MAX_MATCHES)
    : [];
  const byId = new Map(allPeople.map((p) => [p.userId, p]));

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {selected.map((id) => {
            const name = byId.get(id)?.fullName ?? t("unknownPerson");
            return (
              <li key={id} className="bg-muted flex items-center gap-1 rounded-full py-1 pr-1 pl-3 text-xs">
                {name}
                {!disabled && (
                  <button
                    type="button"
                    className="hover:bg-background rounded-full p-0.5"
                    aria-label={t("remove", { name })}
                    onClick={() => onChange(selected.filter((other) => other !== id))}
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {!disabled && (
        <>
          <Input
            value={search}
            placeholder={t("search")}
            aria-label={`${label}: ${t("search")}`}
            onChange={(e) => setSearch(e.target.value)}
            // Enter would otherwise submit the whole packet form.
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          />
          {needle && (
            <ul className="divide-y rounded-lg border">
              {matches.length === 0 && <li className="text-muted-foreground px-3 py-2 text-xs">{t("noMatch")}</li>}
              {matches.map((person) => (
                <li key={person.userId}>
                  <button
                    type="button"
                    className="hover:bg-muted flex w-full items-center gap-2 px-3 py-2 text-left"
                    onClick={() => {
                      onChange([...selected, person.userId]);
                      setSearch("");
                    }}
                  >
                    <Plus className="text-primary size-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{person.fullName}</span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {t(`role.${person.role}`)} · {person.tutorId ? `${person.tutorId} · ` : ""}
                        {person.email}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
