/**
 * PATCH  /api/admin/coupons/[id] — update
 * DELETE /api/admin/coupons/[id] — delete
 */
import { requireAdmin } from '@/server/services/auth.service'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CouponType, CouponTarget } from '@prisma/client'
import { z } from 'zod'

const schema = z.object({
  code: z.string().min(2).optional(),
  description: z.string().optional(),
  type: z.nativeEnum(CouponType).optional(),
  value: z.number().min(0).optional(),
  minSubtotal: z.number().optional(),
  maxDiscount: z.number().optional(),
  usageLimit: z.number().int().optional(),
  perUserLimit: z.number().int().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  appliesTo: z.nativeEnum(CouponTarget).optional(),
  productIds: z.string().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 })
    }
    const data: any = { ...parsed.data }
    if (data.startsAt) data.startsAt = new Date(data.startsAt)
    if (data.endsAt !== undefined) data.endsAt = data.endsAt ? new Date(data.endsAt) : null
    if (data.code) data.code = data.code.toUpperCase().trim()
    const coupon = await db.coupon.update({ where: { id }, data })
    return NextResponse.json({ coupon })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'فشل التحديث' }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params
    await db.coupon.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'فشل الحذف' }, { status: 400 })
  }
}
