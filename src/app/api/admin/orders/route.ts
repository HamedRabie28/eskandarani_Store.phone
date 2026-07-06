/**
 * GET /api/admin/orders — all orders with pagination
 * PATCH /api/admin/orders — update order status { orderId, status, note? }
 */
import { requireAdmin } from '@/server/services/auth.service'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { orderService } from '@/server/services/order.service'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const sp = req.nextUrl.searchParams
    const status = sp.get('status') ?? undefined
    const limit = Number(sp.get('limit') ?? 20)
    const orders = await db.order.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        items: true,
        address: true,
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    })
    return NextResponse.json({ orders })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'فشل' }, { status: 500 })
  }
}

const updateSchema = z.object({
  orderId: z.string(),
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'ON_HOLD']),
  note: z.string().optional(),
})

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 })
    const order = await orderService.updateStatus(parsed.data.orderId, parsed.data.status, parsed.data.note)
    return NextResponse.json({ order })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'فشل' }, { status: 400 })
  }
}
