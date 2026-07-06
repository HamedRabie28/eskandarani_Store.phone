/**
 * GET    /api/admin/categories — list all categories
 * POST   /api/admin/categories — create { name, slug?, description?, imageUrl?, icon?, parentId?, isActive?, sortOrder? }
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
  const cats = await db.category.findMany({
    where: search ? { name: { contains: search } } : undefined,
    include: {
      _count: { select: { products: true } },
      parent: { select: { name: true } },
    },
    orderBy: { sortOrder: 'asc' },
  })
  return NextResponse.json({ categories: cats })
}

const createSchema = z.object({
  name: z.string().min(2, 'الاسم مطلوب'),
  slug: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  icon: z.string().optional(),
  parentId: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
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
    const existing = await db.category.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: 'الـ slug مستخدم بالفعل' }, { status: 400 })
    }
    const category = await db.category.create({ data: { ...data, slug } })
    return NextResponse.json({ category })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'فشل الإنشاء' }, { status: 400 })
  }
}
