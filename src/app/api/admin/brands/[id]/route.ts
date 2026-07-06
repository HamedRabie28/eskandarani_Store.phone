/**
 * PATCH  /api/admin/brands/[id] — update brand
 * DELETE /api/admin/brands/[id] — delete brand (cascade products keep brandId null)
 */
import { requireAdmin } from '@/server/services/auth.service'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  country: z.string().optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params
    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 })
    }
    const brand = await db.brand.update({ where: { id }, data: parsed.data })
    return NextResponse.json({ brand })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'فشل التحديث' }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params
    // Check if there are products using this brand
    const productsCount = await db.product.count({ where: { brandId: id } })
    if (productsCount > 0) {
      // Detach products (set brandId to null) instead of failing
      await db.product.updateMany({ where: { brandId: id }, data: { brandId: null } })
    }
    await db.brand.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'فشل الحذف' }, { status: 400 })
  }
}
