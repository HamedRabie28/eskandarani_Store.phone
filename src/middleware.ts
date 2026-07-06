/**
 * Next.js Middleware — lightweight check for admin routes.
 * Ensures the session cookie exists before allowing access to /api/admin/*.
 * Full database validation is performed securely inside the API routes via requireAdmin().
 * Runs on the Edge runtime.
 */
import { NextRequest, NextResponse } from 'next/server'

const SESSION_COOKIE = 'ask-admin-session'
const ADMIN_API_PREFIX = '/api/admin'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Only protect admin API routes
  if (!pathname.startsWith(ADMIN_API_PREFIX)) {
    return NextResponse.next()
  }

  // Get session token from cookie
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) {
    return NextResponse.json(
      { error: 'غير مصرح — يرجى تسجيل الدخول', code: 'NO_SESSION' },
      { status: 401 }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/admin/:path*'],
}
