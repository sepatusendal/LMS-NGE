export type AppRole = "ADMIN" | "COORDINATOR" | "TEACHER";

export const roleLandingPath: Record<AppRole, string> = {
  ADMIN: "/dashboard",
  COORDINATOR: "/monitoring",
  TEACHER: "/today",
};

const ROUTE_PREFIX_ROLES: Array<{ prefix: string; roles: AppRole[] }> = [
  { prefix: "/dashboard", roles: ["ADMIN"] },
  { prefix: "/monitoring", roles: ["COORDINATOR"] },
  { prefix: "/today", roles: ["TEACHER"] },
];

export function allowedRolesForPath(pathname: string): AppRole[] | null {
  const match = ROUTE_PREFIX_ROLES.find((r) => pathname.startsWith(r.prefix));
  return match ? match.roles : null;
}
