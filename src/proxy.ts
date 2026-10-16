import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/lib/db'
import { ROUTE_ACCESS } from '@/lib/access'

const secretKey = process.env.JWT_SECRET_KEY || "development_secret_do_not_use_in_prod";
const key = new TextEncoder().encode(secretKey);

// Define protected route patterns
const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/api/uploadthing']
const isPublicRoute = (path: string) => publicRoutes.includes(path) || path.startsWith('/_next') || path.startsWith('/invite/') || path.startsWith('/api/paystack/')

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Allow public assets
  if (path.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|css|js)$/)) {
    return NextResponse.next()
  }

  // 1. Check if route is public
  if (isPublicRoute(path)) {
    return NextResponse.next()
  }

  // 2. Read session cookie
  const token = request.cookies.get('session')?.value
  let sessionPayload = null

  if (token) {
    try {
      const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] })
      sessionPayload = payload
    } catch (e) {
      console.log('Invalid JWT token in middleware')
    }
  }

  // 3. Prevent unauthenticated access
  if (!sessionPayload) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 4. Dashboard routes check the session in the database, so a sign-out, an expired session
  // or a role change applies straight away instead of waiting for the token to expire.
  let role = sessionPayload.role
  if (path.startsWith('/dashboard')) {
    const dbSession = typeof sessionPayload.sessionId === 'string'
      ? await db.session.findUnique({
          where: { id: sessionPayload.sessionId },
          select: { expiresAt: true, user: { select: { role: true } } },
        }).catch(() => undefined)
      : null
    if (dbSession === null || (dbSession && dbSession.expiresAt < new Date())) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('session')
      return response
    }
    // If the database can't be reached, fall back to the token; pages check again with auth().
    if (dbSession) role = dbSession.user.role
  }

  // 5. Role-based route protection

  // Route prefixes and the roles allowed in them live in src/lib/access.ts (also shown on the Access control page)

  // Check if the current path is a protected dashboard route
  for (const { prefix: routePrefix, roles: allowedRoles } of ROUTE_ACCESS) {
    if (path.startsWith(routePrefix)) {
      if (!(allowedRoles as string[]).includes(role as string)) {
        // Teachers looking for settings get their own profile; everything else goes home
        const fallback = routePrefix === '/dashboard/settings' ? '/dashboard/profile' : '/dashboard'
        return NextResponse.redirect(new URL(fallback, request.url));
      }
    }
  }

  // Allow access if logged in and role checks passed
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    '/((?!_next/static|_next/image|favicon.ico).*)', // Keep other non-dashboard routes protected as before
  ],
}
