import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  allowedRolesForPath,
  roleLandingPath,
  type AppRole,
} from "@/features/auth/role-routes";

function redirectTo(request: NextRequest, response: NextResponse, path: string) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  const redirectResponse = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}

// Custom domains once attached (e.g. raport.nufaglobal.id) match by prefix.
const PARENT_HOSTS = ["raport.", "laporan.", "parent.", "ortu."];

// The dedicated "ec-parent" Vercel project (same codebase, scoped to the
// parent portal by host) — its assigned domains are ec-parent.vercel.app in
// production and ec-parent-<hash>-nge1.vercel.app for preview deployments,
// so match on the project name prefix rather than one exact hostname. Keep
// this until a custom domain is attached, at which point PARENT_HOSTS above
// takes over and this can be removed.
const PARENT_HOST_PROJECT_PREFIX = "ec-parent";

const PARENT_ALLOWED_PREFIXES = [
  "/parent-report",
  "/api/parent-report",
  "/api/parent-reports/",
];

function isParentHost(host: string): boolean {
  return (
    PARENT_HOSTS.some((h) => host.startsWith(h)) ||
    host.startsWith(PARENT_HOST_PROJECT_PREFIX)
  );
}

function isParentAllowedPath(pathname: string): boolean {
  return PARENT_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";

  // ── Parent Portal (raport.* / laporan.* / parent.* / ortu.*) ──
  if (isParentHost(host)) {
    if (isParentAllowedPath(pathname)) {
      return response;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/parent-report";
    return NextResponse.redirect(url);
  }

  // ── Normal App (admin / teacher / coordinator) ──
  if (!user) {
    if (pathname === "/login") return response;
    if (pathname.startsWith("/parent-report")) return response;
    if (pathname.startsWith("/api/parent-report")) return response;
    if (pathname.startsWith("/api/parent-reports") && pathname.endsWith("/download")) return response;
    return redirectTo(request, response, "/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return redirectTo(request, response, "/login");
  }

  const role = profile.role as AppRole;

  if (pathname === "/login") {
    return redirectTo(request, response, roleLandingPath[role]);
  }

  const allowedRoles = allowedRolesForPath(pathname);
  if (!allowedRoles.includes(role)) {
    return redirectTo(request, response, roleLandingPath[role]);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
