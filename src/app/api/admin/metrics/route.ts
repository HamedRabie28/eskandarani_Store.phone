/**
 * GET /api/admin/metrics — dashboard analytics
 */
import { NextResponse } from 'next/server'
import { orderService } from '@/server/services/order.service'

export async function GET() {
  try {
    await requireAdmin();
    const metrics = await orderService.adminMetrics()
    return NextResponse.json(metrics)
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'فشل' }, { status: 500 })
  }
}
