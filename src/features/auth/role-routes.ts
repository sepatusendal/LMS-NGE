export type AppRole = "ADMIN" | "COORDINATOR" | "TEACHER";

export const roleLandingPath: Record<AppRole, string> = {
  ADMIN: "/dashboard",
  COORDINATOR: "/monitoring",
  TEACHER: "/today",
};

const ROUTE_PREFIX_ROLES: Array<{ prefix: string; roles: AppRole[] }> = [
  { prefix: "/dashboard", roles: ["ADMIN"] },
  { prefix: "/schools", roles: ["ADMIN"] },
  { prefix: "/teachers", roles: ["ADMIN"] },
  { prefix: "/students", roles: ["ADMIN"] },
  { prefix: "/classes", roles: ["ADMIN"] },
  { prefix: "/curriculum", roles: ["ADMIN"] },
  { prefix: "/lesson-plans", roles: ["ADMIN"] },
  { prefix: "/reports", roles: ["ADMIN"] },
  { prefix: "/parent-reports", roles: ["ADMIN"] },
  { prefix: "/api/parent-reports", roles: ["ADMIN"] },
  { prefix: "/settings", roles: ["ADMIN"] },
  { prefix: "/monitoring", roles: ["COORDINATOR"] },
  { prefix: "/today", roles: ["TEACHER"] },
  { prefix: "/lesson-plan", roles: ["ADMIN", "TEACHER"] },
  { prefix: "/profile", roles: ["TEACHER"] },
];

export function allowedRolesForPath(pathname: string): AppRole[] | null {
  const match = ROUTE_PREFIX_ROLES.find((r) => pathname.startsWith(r.prefix));
  return match ? match.roles : null;
}
