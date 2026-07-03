/**
 * Next.js Middleware — protects all admin API routes.
 * Checks for valid session cookie before allowing access to /api/admin/*.
 * If no valid session, returns 401 Unauthorized.
 *
 * This is the FIRST line of defense — even if the UI is bypassed,
 * the API will reject all unauthorized requests.
 *
 * NOTE: Uses Node.js runtime (not edge) because we need Prisma DB access.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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

  // Validate session against database
  try {
    const session = await db.session.findUnique({
      where: { token },
      include: { user: { select: { id: true, email: true, name: true, role: true } } },
    })

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'جلسة غير صالحة', code: 'INVALID_SESSION' },
        { status: 401 }
      )
    }

    // Check expiry
    if (session.expiresAt < new Date()) {
      // Clean up expired session
      await db.session.delete({ where: { id: session.id } }).catch(() => {})
      return NextResponse.json(
        { error: 'انتهت صلاحية الجلسة', code: 'EXPIRED_SESSION' },
        { status: 401 }
      )
    }

    // Only admin roles
    if (session.user.role === 'CUSTOMER') {
      return NextResponse.json(
        { error: 'ليس لديك صلاحية', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // Add user info to request headers for downstream use
    const response = NextResponse.next()
    response.headers.set('x-admin-user-id', session.user.id)
    response.headers.set('x-admin-user-email', session.user.email)
    response.headers.set('x-admin-user-role', session.user.role)
    return response
  } catch (error: any) {
    console.error('Middleware auth error:', error?.message)
    return NextResponse.json(
      { error: 'خطأ في التحقق من الجلسة', code: 'VERIFY_ERROR', detail: error?.message },
      { status: 500 }
    )
  }
}

export const config = {
  matcher: ['/api/admin/:path*'],
}

// Force Node.js runtime (not edge) for Prisma support
export const runtime = 'nodejs'
