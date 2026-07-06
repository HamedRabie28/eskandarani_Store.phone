/**
 * GET    /api/admin/brands — list all
 * POST   /api/admin/brands — create { name, slug?, description?, logoUrl?, country?, isActive? }
 */
import { requireAdmin } from '@/server/services/auth.service'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

function slugify(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const search = sp.get('search') ?? undefined
  const brands = await db.brand.findMany({
    where: search ? { name: { contains: search } } : undefined,
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ brands })
}

const createSchema = z.object({
  name: z.string().min(2, 'الاسم مطلوب'),
  slug: z.string().optional(),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  country: z.string().optional(),
  isActive: z.boolean().default(true),
})

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'بيانات غير صحيحة', details: parsed.error.flatten() }, { status: 400 })
    }
    const data = parsed.data
    const slug = data.slug || slugify(data.name)
    // Ensure unique slug
    const existing = await db.brand.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: 'الـ slug مستخدم بالفعل' }, { status: 400 })
    }
    const brand = await db.brand.create({ data: { ...data, slug } })
    return NextResponse.json({ brand })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'فشل الإنشاء' }, { status: 400 })
  }
}
