/**
 * POST /api/checkout/place — create order
 * {
 *   address, shippingMethod, shippingCost, couponCode?, couponDiscount?, couponFreeShipping?,
 *   paymentMethod, customerNotes?
 * }
 */
import { NextRequest, NextResponse } from 'next/server'
import { orderService } from '@/server/services/order.service'
import { cartService } from '@/server/services/cart.service'
import { paymobService } from '@/server/services/paymob.service'
import { getCartContext, ensureGuestToken } from '@/server/lib/cart-context'
import { z } from 'zod'

const addressSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  address1: z.string().min(5),
  address2: z.string().optional(),
  city: z.string().min(2),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('Egypt'),
})

const schema = z.object({
  address: addressSchema,
  shippingMethod: z.string().min(1),
  shippingCost: z.number().min(0),
  couponCode: z.string().optional(),
  couponDiscount: z.number().optional(),
  couponFreeShipping: z.boolean().optional(),
  paymentMethod: z.string().min(1),
  customerNotes: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'بيانات غير صحيحة', details: parsed.error.flatten() }, { status: 400 })
    }

    const ctx = await getCartContext()
    const res = NextResponse.json({})
    if (!ctx.userId && !ctx.guestToken) {
      ctx.guestToken = await ensureGuestToken(res)
    }
    const lines = await cartService.getLines(ctx)
    if (lines.length === 0) {
      return NextResponse.json({ error: 'السلة فارغة' }, { status: 400 })
    }

    const order = await orderService.create({
      userId: ctx.userId,
      guestEmail: parsed.data.address.email,
      guestToken: ctx.guestToken,
      lines,
      address: parsed.data.address,
      shippingMethod: parsed.data.shippingMethod,
      shippingCost: parsed.data.shippingCost,
      couponCode: parsed.data.couponCode,
      couponDiscount: parsed.data.couponDiscount,
      couponFreeShipping: parsed.data.couponFreeShipping,
      paymentMethod: parsed.data.paymentMethod,
      customerNotes: parsed.data.customerNotes,
    })

    if (parsed.data.paymentMethod === 'card' || parsed.data.paymentMethod === 'wallet') {
      const paymentUrl = await paymobService.createPaymentUrl(order, parsed.data.address)
      return NextResponse.json({ order, paymentUrl }, {
        headers: res.headers,
      })
    }

    return NextResponse.json({ order }, {
      headers: res.headers,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'فشل إنشاء الطلب' }, { status: 400 })
  }
}
