import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secretKey = process.env.JWT_SECRET_KEY || "development_secret_do_not_use_in_prod";
const key = new TextEncoder().encode(secretKey);

// Define protected route patterns
const publicRoutes = ['/', '/login', '/register', '/api/uploadthing']
const isPublicRoute = (path: string) => publicRoutes.includes(path) || path.startsWith('/_next')

export async function middleware(request: NextRequest) {
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

  // 4. Role-based route protection
  const { role } = sessionPayload;
  
  // Define route prefixes and the roles allowed to access them
  const protectedRoutes = {
    "/dashboard/global-settings": ["SUPERADMIN"],
    "/dashboard/knowledge": ["SUPERADMIN"],
    "/dashboard/tenants": ["SUPERADMIN"],
    "/dashboard/teachers": ["SUPERADMIN", "ADMIN"],
    "/dashboard/settings": ["SUPERADMIN", "ADMIN"],
    "/dashboard/schemes": ["SUPERADMIN", "ADMIN", "TEACHER"],
    "/dashboard/lessons": ["SUPERADMIN", "ADMIN", "TEACHER"],
    "/dashboard/assessments": ["SUPERADMIN", "ADMIN", "TEACHER"],
    "/dashboard": ["SUPERADMIN", "ADMIN", "TEACHER"], // Core dashboard access
  };

  // Check if the current path is a protected dashboard route
  for (const routePrefix in protectedRoutes) {
    if (path.startsWith(routePrefix)) {
      const allowedRoles = protectedRoutes[routePrefix as keyof typeof protectedRoutes];
      if (!allowedRoles.includes(role as string)) {
        // Redirect to a generic dashboard if the user doesn't have access to the specific sub-dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url));
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
