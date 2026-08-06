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

export async function middleware(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);
  const { pathname } = request.nextUrl;

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
  if (allowedRoles && !allowedRoles.includes(role)) {
    return redirectTo(request, response, roleLandingPath[role]);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
