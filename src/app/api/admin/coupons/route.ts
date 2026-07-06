/**
 * GET    /api/admin/coupons — list all
 * POST   /api/admin/coupons — create
 */
import { requireAdmin } from '@/server/services/auth.service'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CouponType, CouponTarget } from '@prisma/client'
import { z } from 'zod'

export async function GET() {
  try {
    await requireAdmin();
    const coupons = await db.coupon.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ coupons })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

const schema = z.object({
  code: z.string().min(2).transform(s => s.toUpperCase().trim()),
  description: z.string().optional(),
  type: z.nativeEnum(CouponType),
  value: z.number().min(0),
  minSubtotal: z.number().optional(),
  maxDiscount: z.number().optional(),
  usageLimit: z.number().int().optional(),
  perUserLimit: z.number().int().optional(),
  startsAt: z.string().transform(s => new Date(s)),
  endsAt: z.string().nullable().optional().transform(s => s ? new Date(s) : null),
  isActive: z.boolean().default(true),
  appliesTo: z.nativeEnum(CouponTarget).default(CouponTarget.ALL),
  productIds: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'بيانات غير صحيحة', details: parsed.error.flatten() }, { status: 400 })
    }
    const coupon = await db.coupon.create({ data: parsed.data as any })
    return NextResponse.json({ coupon })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'فشل الإنشاء' }, { status: 400 })
  }
}
