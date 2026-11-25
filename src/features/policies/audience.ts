// Who has to receive a policy packet. The database decides this for real
// (policy_user_is_recipient); these helpers drive the admin form and its
// preview. Keep this file free of server imports.

import type { AppRole } from "@/features/auth/role-routes";

export const AUDIENCE_ROLES: AppRole[] = ["TEACHER", "COORDINATOR", "ADMIN"];

export interface PolicyAudience {
  roles: AppRole[];
  /** People who receive it in addition to the chosen roles. */
  includedUserIds: string[];
  /** Always wins over roles and inclusion. */
  excludedUserIds: string[];
}

export type AudienceMode = "ALL" | "ROLES" | "PEOPLE";
export const AUDIENCE_MODES: AudienceMode[] = ["ALL", "ROLES", "PEOPLE"];

export interface AudienceFormValue extends PolicyAudience {
  mode: AudienceMode;
}

export interface AudiencePerson {
  userId: string;
  fullName: string;
  email: string;
  role: AppRole;
  tutorId: string | null;
}

/** A new packet starts with tutors selected, shown plainly in the form. */
export const DEFAULT_AUDIENCE: PolicyAudience = { roles: ["TEACHER"], includedUserIds: [], excludedUserIds: [] };

export function toAudienceForm(audience: PolicyAudience): AudienceFormValue {
  const everyRole = AUDIENCE_ROLES.every((role) => audience.roles.includes(role));
  const mode: AudienceMode = everyRole ? "ALL" : audience.roles.length > 0 ? "ROLES" : "PEOPLE";
  return {
    mode,
    roles: [...audience.roles],
    includedUserIds: [...audience.includedUserIds],
    excludedUserIds: [...audience.excludedUserIds],
  };
}

/** What gets stored: only the parts that belong to the chosen mode. */
export function fromAudienceForm(value: AudienceFormValue): PolicyAudience {
  if (value.mode === "PEOPLE") {
    return { roles: [], includedUserIds: value.includedUserIds, excludedUserIds: [] };
  }
  return {
    roles: value.mode === "ALL" ? [...AUDIENCE_ROLES] : value.roles,
    includedUserIds: [],
    excludedUserIds: value.excludedUserIds,
  };
}

/** Nothing selected is an error, never "everyone". */
export function isAudienceChosen(value: AudienceFormValue): boolean {
  const audience = fromAudienceForm(value);
  return audience.roles.length > 0 || audience.includedUserIds.length > 0;
}

/** Mirrors the database rule. `people` must hold active accounts only. */
export function pickRecipients(audience: PolicyAudience, people: AudiencePerson[]): AudiencePerson[] {
  const roles = new Set(audience.roles);
  const included = new Set(audience.includedUserIds);
  const excluded = new Set(audience.excludedUserIds);
  return people.filter((p) => !excluded.has(p.userId) && (roles.has(p.role) || included.has(p.userId)));
}

export interface AudienceChange {
  id: string;
  changedByName: string | null;
  changedAt: string;
  after: PolicyAudience;
}
