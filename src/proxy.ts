import { jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ROUTE_ACCESS } from "@/lib/access";
import { db } from "@/lib/db";
import { loginHref } from "@/lib/safe-next";
import { firstTouch, SOURCE_COOKIE, SOURCE_MAX_AGE } from "@/lib/signup-source";

const secretKey =
  process.env.JWT_SECRET_KEY || "development_secret_do_not_use_in_prod";
const key = new TextEncoder().encode(secretKey);

// Define protected route patterns
const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/api/uploadthing",
  "/api/health",
  "/designs",
  "/sitemap.xml",
  "/robots.txt",
  "/manifest.webmanifest",
  "/offline.html",
];
const isPublicRoute = (path: string) =>
  publicRoutes.includes(path) ||
  path.startsWith("/_next") ||
  path.startsWith("/invite/") ||
  path.startsWith("/designs/") ||
  path.startsWith("/api/paystack/");

/** Sends a signed-out visitor to sign in, then back to the page they wanted. API calls get a 401 instead. */
function toLogin(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const wantsPage = request.headers.get("accept")?.includes("text/html");
  if (pathname.startsWith("/api/") && !wantsPage)
    return NextResponse.json(
      { error: "Your session has ended. Please sign in again." },
      { status: 401 },
    );
  return NextResponse.redirect(
    new URL(loginHref(`${pathname}${search}`), request.url),
  );
}

async function readSession(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return payload;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Signed-in teachers who open the sign-in or sign-up page go straight to Home.
  if (
    (path === "/login" || path === "/register") &&
    (await readSession(request.cookies.get("session")?.value))
  )
    return NextResponse.redirect(new URL("/dashboard", request.url));

  // Allow public assets
  if (path.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|css|js)$/)) {
    return NextResponse.next();
  }

  // 1. Check if route is public. On a first visit, note where the teacher came from.
  if (isPublicRoute(path)) {
    const response = NextResponse.next();
    if (
      !path.startsWith("/api/") &&
      !path.startsWith("/_next") &&
      !request.cookies.has(SOURCE_COOKIE)
    )
      response.cookies.set(SOURCE_COOKIE, firstTouch(request), {
        maxAge: SOURCE_MAX_AGE,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
    return response;
  }

  // 2. Read session cookie
  const sessionPayload = await readSession(
    request.cookies.get("session")?.value,
  );

  // 3. Prevent unauthenticated access
  if (!sessionPayload) return toLogin(request);

  // 4. Dashboard routes check the session in the database, so a sign-out, an expired session
  // or a role change applies straight away instead of waiting for the token to expire.
  let role = sessionPayload.role;
  if (path.startsWith("/dashboard")) {
    const dbSession =
      typeof sessionPayload.sessionId === "string"
        ? await db.session
            .findUnique({
              where: { id: sessionPayload.sessionId },
              select: { expiresAt: true, user: { select: { role: true } } },
            })
            .catch(() => undefined)
        : null;
    if (dbSession === null || (dbSession && dbSession.expiresAt < new Date())) {
      const response = toLogin(request);
      response.cookies.delete("session");
      return response;
    }
    // If the database can't be reached, fall back to the token; pages check again with auth().
    if (dbSession) role = dbSession.user.role;
  }

  // 5. Role-based route protection

  // Route prefixes and the roles allowed in them live in src/lib/access.ts (also shown on the Access control page)

  // Check if the current path is a protected dashboard route
  for (const { prefix: routePrefix, roles: allowedRoles } of ROUTE_ACCESS) {
    if (path.startsWith(routePrefix)) {
      if (!(allowedRoles as string[]).includes(role as string)) {
        // Teachers looking for settings get their own profile; everything else goes home
        const fallback =
          routePrefix === "/dashboard/settings"
            ? "/dashboard/profile"
            : "/dashboard";
        return NextResponse.redirect(new URL(fallback, request.url));
      }
    }
  }

  // Allow access if logged in and role checks passed
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/((?!_next/static|_next/image|favicon.ico).*)", // Keep other non-dashboard routes protected as before
  ],
};
