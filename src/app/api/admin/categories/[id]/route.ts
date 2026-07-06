/**
 * PATCH  /api/admin/categories/[id]
 * DELETE /api/admin/categories/[id]
 */
import { requireAdmin } from '@/server/services/auth.service'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  icon: z.string().optional(),
  parentId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
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
    const category = await db.category.update({ where: { id }, data: parsed.data })
    return NextResponse.json({ category })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'فشل التحديث' }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params
    // Detach products
    await db.product.updateMany({ where: { categoryId: id }, data: { categoryId: null } })
    // Detach children
    await db.category.updateMany({ where: { parentId: id }, data: { parentId: null } })
    await db.category.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'فشل الحذف' }, { status: 400 })
  }
}
