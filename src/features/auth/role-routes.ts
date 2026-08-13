export type AppRole = "ADMIN" | "COORDINATOR" | "TEACHER";

export const roleLandingPath: Record<AppRole, string> = {
  ADMIN: "/dashboard",
  COORDINATOR: "/monitoring",
  TEACHER: "/today",
};

const ALL_ROLES: AppRole[] = ["ADMIN", "COORDINATOR", "TEACHER"];

// Every authenticated route must be listed here, most-specific prefix first
// (e.g. "/lesson-plans" before "/lesson-plan", "/api/parent-reports" before
// "/api/parent-report") since matching is first-match-wins on startsWith.
// A path with no match is DENIED by default — previously an unlisted path
// fell through to "no restriction", which is how /users, /substitutes, and
// /holidays ended up reachable by any authenticated role.
const ROUTE_PREFIX_ROLES: Array<{ prefix: string; roles: AppRole[] }> = [
  { prefix: "/dashboard", roles: ["ADMIN"] },
  { prefix: "/schools", roles: ["ADMIN"] },
  { prefix: "/teachers", roles: ["ADMIN"] },
  { prefix: "/students", roles: ["ADMIN"] },
  { prefix: "/classes", roles: ["ADMIN"] },
  { prefix: "/teacher-training", roles: ["ADMIN"] },
  { prefix: "/curriculum", roles: ["ADMIN"] },
  { prefix: "/holidays", roles: ["ADMIN"] },
  { prefix: "/substitutes", roles: ["ADMIN"] },
  { prefix: "/users", roles: ["ADMIN"] },
  { prefix: "/lesson-plans", roles: ["ADMIN"] },
  { prefix: "/reports", roles: ["ADMIN"] },
  { prefix: "/parent-reports", roles: ["ADMIN"] },
  { prefix: "/api/parent-reports", roles: ["ADMIN"] },
  { prefix: "/api/curriculum", roles: ["ADMIN"] },
  { prefix: "/settings", roles: ["ADMIN"] },
  { prefix: "/monitoring", roles: ["COORDINATOR"] },
  { prefix: "/today", roles: ["TEACHER"] },
  { prefix: "/absensi", roles: ["TEACHER"] },
  { prefix: "/kelas", roles: ["TEACHER"] },
  { prefix: "/jadwal", roles: ["TEACHER"] },
  { prefix: "/lesson-plan", roles: ["ADMIN", "TEACHER"] },
  { prefix: "/profile", roles: ["TEACHER"] },
  // Shared or public-ish routes, reachable by any logged-in role.
  { prefix: "/api/drive", roles: ALL_ROLES },
  { prefix: "/api/parent-report", roles: ALL_ROLES },
  { prefix: "/parent-report", roles: ALL_ROLES },
  { prefix: "/privacy-policy", roles: ALL_ROLES },
];

export function allowedRolesForPath(pathname: string): AppRole[] {
  const match = ROUTE_PREFIX_ROLES.find((r) => pathname.startsWith(r.prefix));
  return match ? match.roles : [];
}
