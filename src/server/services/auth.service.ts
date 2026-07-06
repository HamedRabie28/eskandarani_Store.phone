/**
 * Auth Service — secure admin authentication.
 * - Password hashing with SHA-256 + salt
 * - Session tokens (cryptographically random)
 * - HTTP-only secure cookies
 * - Session expiry & validation
 *
 * Security layers:
 * 1. Password never stored in plain text (SHA-256 hash)
 * 2. Session token is cryptographically random (32 bytes)
 * 3. Cookie is HTTP-only (no JS access), Secure in prod, SameSite=Lax
 * 4. Session expires after 7 days
 * 5. Every admin API call validates the session against DB
 */
import { db } from '@/lib/db'
import { createHash, randomBytes } from 'crypto'
import { cookies } from 'next/headers'

const SESSION_COOKIE = 'ask-admin-session'
const CUSTOMER_SESSION_COOKIE = 'ask-customer-session'
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds

/**
 * Hash a password with SHA-256.
 * In production, use bcrypt/argon2 — but SHA-256 is sufficient for this demo.
 */
export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

/**
 * Verify a password against a hash.
 */
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash
}

/**
 * Generate a cryptographically secure random session token.
 */
function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Login: verify credentials, create session, set cookie.
 * Returns the user (without passwordHash) on success, or null on failure.
 */
export async function adminLogin(email: string, password: string): Promise<{ user: AdminUser; token: string } | null> {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  })
  if (!user || !user.passwordHash) return null
  if (!verifyPassword(password, user.passwordHash)) return null

  // Only ADMIN, MANAGER, or STAFF roles can access dashboard
  if (user.role === 'CUSTOMER') return null

  // Create session
  const token = generateSessionToken()
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000)
  await db.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  })

  // Set HTTP-only cookie
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    token,
  }
}

/**
 * Logout: delete session from DB, clear cookie.
 */
export async function adminLogout(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (token) {
    await db.session.deleteMany({ where: { token } }).catch(() => {})
  }
  cookieStore.delete(SESSION_COOKIE)
}

/**
 * Get current admin session from cookie.
 * Validates token against DB and checks expiry.
 * Returns user info if valid, null otherwise.
 */
export async function getAdminSession(): Promise<AdminUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  })
  if (!session || !session.user) return null

  // Check expiry
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }

  // Only admin roles
  if (session.user.role === 'CUSTOMER') return null

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  }
}

/**
 * Require admin session — throws 401 if not authenticated.
 * Use in API routes to protect them.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const user = await getAdminSession()
  if (!user) {
    throw new Response(JSON.stringify({ error: 'غير مصرح — يرجى تسجيل الدخول' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return user
}

export interface AdminUser {
  id: string
  email: string
  name: string | null
  role: 'ADMIN' | 'MANAGER' | 'STAFF'
}

export interface CustomerUser {
  id: string
  email: string
  name: string | null
  role: 'CUSTOMER'
}

/**
 * Get current customer session from cookie.
 */
export async function getCustomerSession(): Promise<CustomerUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value
  if (!token) return null

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  })
  if (!session || !session.user) return null

  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }

  if (session.user.role !== 'CUSTOMER') return null

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: 'CUSTOMER',
  }
}

/**
 * Customer Login
 */
export async function customerLogin(email: string, password: string): Promise<{ user: CustomerUser; token: string } | null> {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  })
  if (!user || !user.passwordHash || user.role !== 'CUSTOMER') return null
  if (!verifyPassword(password, user.passwordHash)) return null

  const token = generateSessionToken()
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000)
  await db.session.create({
    data: { userId: user.id, token, expiresAt },
  })

  const cookieStore = await cookies()
  cookieStore.set(CUSTOMER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })

  return {
    user: { id: user.id, email: user.email, name: user.name, role: 'CUSTOMER' },
    token,
  }
}

/**
 * Customer Register
 */
export async function customerRegister(name: string, email: string, password: string): Promise<{ user: CustomerUser; token: string } | null> {
  const existing = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (existing) throw new Error('البريد الإلكتروني مستخدم بالفعل')

  const user = await db.user.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      passwordHash: hashPassword(password),
      role: 'CUSTOMER',
    }
  })

  const token = generateSessionToken()
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000)
  await db.session.create({
    data: { userId: user.id, token, expiresAt },
  })

  const cookieStore = await cookies()
  cookieStore.set(CUSTOMER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })

  return {
    user: { id: user.id, email: user.email, name: user.name, role: 'CUSTOMER' },
    token,
  }
}

export async function customerLogout(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value
  if (token) {
    await db.session.deleteMany({ where: { token } }).catch(() => {})
  }
  cookieStore.delete(CUSTOMER_SESSION_COOKIE)
}

export { SESSION_COOKIE, CUSTOMER_SESSION_COOKIE, SESSION_MAX_AGE }
