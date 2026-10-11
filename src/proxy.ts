import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { OWNER_COOKIE, STAFF_COOKIE } from "@/lib/bff/cookies";

const intl = createMiddleware(routing);

const STAFF_PUBLIC = new Set(["/login"]);
const OWNER_PUBLIC = new Set(["/owner/sign-in", "/owner/verify"]);

// Optimistic redirects only (cookie present or not). The API authorizes every call.
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const first = pathname.split("/")[1] ?? "";
  const prefix = (routing.locales as readonly string[]).includes(first) ? `/${first}` : "";
  const path = pathname.slice(prefix.length) || "/";

  const redirectTo = (target: string) => NextResponse.redirect(new URL(`${prefix}${target}`, req.url));

  if (path === "/owner" || path.startsWith("/owner/")) {
    const signedIn = req.cookies.has(OWNER_COOKIE);
    if (!signedIn && !OWNER_PUBLIC.has(path)) return redirectTo("/owner/sign-in");
    if (signedIn && OWNER_PUBLIC.has(path)) return redirectTo("/owner");
  } else {
    const signedIn = req.cookies.has(STAFF_COOKIE);
    if (!signedIn && !STAFF_PUBLIC.has(path)) {
      const next = path === "/" ? "" : `?next=${encodeURIComponent(path + search)}`;
      return redirectTo(`/login${next}`);
    }
    if (signedIn && STAFF_PUBLIC.has(path)) return redirectTo("/");
  }

  return intl(req);
}

export const config = {
  // Skip the BFF, Next internals and files with an extension.
  matcher: ["/((?!bff|_next|_vercel|.*\\..*).*)"],
};
