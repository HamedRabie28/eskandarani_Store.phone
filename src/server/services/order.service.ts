/**
 * Order Service — orchestrates order creation, status, invoices.
 * Implements: unique order number, inventory reservation, status history,
 * notes, cancellation rules, reorder, invoice-ready data.
 */
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import type { OrderSummary, OrderStatus, PaymentStatus, CartLine, CheckoutAddress } from '@/types'
import { cartService } from './cart.service'
import { couponService } from './coupon.service'
import { shippingService } from './shipping.service'
import { emailService } from './email.service'

export interface CreateOrderInput {
  userId?: string
  guestEmail?: string
  guestToken?: string
  lines: CartLine[]
  address: CheckoutAddress
  shippingMethod: string
  shippingCost: number
  couponCode?: string
  couponDiscount?: number
  couponFreeShipping?: boolean
  paymentMethod: string
  customerNotes?: string
}

function generateOrderNumber(): string {
  const date = new Date()
  const y = date.getFullYear().toString().slice(-2)
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `ASK-${y}${m}${d}-${rand}`
}

export const orderService = {
  async create(input: CreateOrderInput): Promise<OrderSummary> {
    if (input.lines.length === 0) throw new Error('السلة فارغة')

    const orderNumber = generateOrderNumber()
    const subtotal = input.lines.reduce((s, l) => s + l.price * l.quantity, 0)
    const discount = input.couponDiscount ?? 0
    const shippingCost = input.couponFreeShipping ? 0 : input.shippingCost
    const total = Math.max(0, subtotal - discount + shippingCost)

    // Use transaction to reserve inventory + create order atomically
    const order = await db.$transaction(async (tx) => {
      // Reserve stock for each line
      for (const line of input.lines) {
        if (line.variantId) {
          const variant = await tx.productVariant.findUnique({ where: { id: line.variantId } })
          if (!variant) throw new Error(`النسخة غير موجودة: ${line.sku}`)
          const available = variant.stock - variant.reservedStock
          if (available < line.quantity) {
            throw new Error(`الكمية غير متوفرة لـ ${line.name}: المتاح ${available}`)
          }
          // Decrement stock & clear reservation
          await tx.productVariant.update({
            where: { id: line.variantId },
            data: {
              stock: { decrement: line.quantity },
              reservedStock: { decrement: Math.min(variant.reservedStock, line.quantity) },
            },
          })
        }
        // Increment sold count
        await tx.product.update({
          where: { id: line.productId },
          data: { soldCount: { increment: line.quantity } },
        })
      }

      // Cleanup Cart and Reservations atomically
      const cartTokens: string[] = []
      if (input.userId) cartTokens.push(input.userId)
      if (input.guestToken) cartTokens.push(input.guestToken)
      
      for (const token of cartTokens) {
        // Delete reservations without decrementing reservedStock again (already done above)
        await tx.inventoryReservation.deleteMany({ where: { token } })
        
        // Find and delete cart items
        const cart = await tx.cart.findFirst({ where: { OR: [{ userId: token }, { guestToken: token }] } })
        if (cart) {
          await tx.cartItem.deleteMany({ where: { cartId: cart.id } })
        }
      }

      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: input.userId,
          guestEmail: input.guestEmail ?? input.address.email,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          fulfillmentStatus: 'UNFULFILLED',
          subtotal,
          discount,
          shippingCost,
          tax: 0,
          total,
          currency: 'EGP',
          couponCode: input.couponCode,
          shippingMethod: input.shippingMethod,
          customerNotes: input.customerNotes,
          items: {
            create: input.lines.map(l => ({
              name: l.name,
              sku: l.sku,
              variantName: l.variantName,
              price: l.price,
              quantity: l.quantity,
              total: l.price * l.quantity,
              imageUrl: l.imageUrl,
              productIdRef: l.productId,
              variantId: l.variantId,
            })),
          },
          address: {
            create: {
              firstName: input.address.firstName,
              lastName: input.address.lastName,
              email: input.address.email,
              phone: input.address.phone,
              address1: input.address.address1,
              address2: input.address.address2,
              city: input.address.city,
              state: input.address.state,
              postalCode: input.address.postalCode,
              country: input.address.country,
            },
          },
          transactions: input.paymentMethod !== 'cod' ? {
            create: [{
              gateway: input.paymentMethod,
              reference: `${orderNumber}-TXN`,
              amount: total,
              currency: 'EGP',
              status: 'PENDING',
              type: 'PAYMENT',
            }],
          } : undefined,
        },
        include: {
          items: true,
          address: true,
          statusHistory: true,
        },
      })

      // Initial status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: newOrder.id,
          status: 'PENDING',
          note: 'تم استلام الطلب',
          createdAt: newOrder.createdAt,
        },
      })

      return newOrder
    })

    // Increment coupon usage
    if (input.couponCode) {
      await couponService.incrementUsage(input.couponCode).catch(() => {})
    }

    // Trigger order confirmation email in the background
    emailService.sendOrderConfirmation(order.id).catch(console.error)

    const orderSummary = await this.toSummary(order.id)
    if (!orderSummary) throw new Error('Order summary unavailable')
    return orderSummary
  },

  async getById(id: string): Promise<OrderSummary | null> {
    return this.toSummary(id)
  },

  async getByNumber(orderNumber: string, email?: string): Promise<OrderSummary | null> {
    const order = await db.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        address: true,
        user: { select: { email: true } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        notes_log: { orderBy: { createdAt: 'desc' } },
      },
    })
    if (!order) return null
    if (email && order.guestEmail !== email && order.user?.email !== email) return null
    return this.toSummary(order.id)
  },

  async listByUser(userId: string): Promise<OrderSummary[]> {
    const orders = await db.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { items: true, address: true, statusHistory: { orderBy: { createdAt: 'asc' } } },
    })
    return Promise.all(orders.map(async (o) => {
      const summary = await this.toSummary(o.id)
      if (!summary) throw new Error(`Order summary missing for ${o.id}`)
      return summary
    }))
  },

  async listRecent(limit = 10): Promise<OrderSummary[]> {
    const orders = await db.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { items: true, address: true, statusHistory: { orderBy: { createdAt: 'asc' } } },
    })
    return Promise.all(orders.map(async (o) => {
      const summary = await this.toSummary(o.id)
      if (!summary) throw new Error(`Order summary missing for ${o.id}`)
      return summary
    }))
  },

  async updateStatus(orderId: string, status: OrderStatus, note?: string): Promise<OrderSummary> {
    const order = await db.order.findUnique({ where: { id: orderId } })
    if (!order) throw new Error('الطلب غير موجود')

    const updates: Prisma.OrderUpdateInput = { status }
    const now = new Date()
    if (status === 'CONFIRMED') updates.confirmedAt = now
    if (status === 'SHIPPED') updates.shippedAt = now
    if (status === 'DELIVERED') {
      updates.deliveredAt = now
      updates.fulfillmentStatus = 'FULFILLED'
      updates.paymentStatus = 'PAID'
    }
    if (status === 'CANCELLED') updates.cancelledAt = now

    await db.$transaction([
      db.order.update({ where: { id: orderId }, data: updates }),
      db.orderStatusHistory.create({
        data: { orderId, status, note: note ?? statusToNote(status), createdAt: now },
      }),
    ])

    const updatedSummary = await this.toSummary(orderId)
    if (!updatedSummary) throw new Error('Order summary unavailable')

    // Trigger status update email in the background
    emailService.sendOrderStatusUpdate(orderId, status, note).catch(console.error)

    return updatedSummary
  },

  async updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus, note?: string): Promise<void> {
    await db.$transaction([
      db.order.update({ where: { id: orderId }, data: { paymentStatus } }),
      db.orderStatusHistory.create({
        data: { 
          orderId, 
          status: paymentStatus === 'PAID' ? 'CONFIRMED' : 'PENDING', 
          note: note ?? `تحديث حالة الدفع إلى: ${paymentStatus}`, 
          createdAt: new Date() 
        },
      }),
    ])
  },

  async cancel(orderId: string, reason: string): Promise<OrderSummary> {
    const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } })
    if (!order) throw new Error('الطلب غير موجود')
    if (['SHIPPED', 'DELIVERED', 'REFUNDED'].includes(order.status)) {
      throw new Error('لا يمكن إلغاء الطلب في هذه الحالة')
    }
    // Restock
    await db.$transaction(async (tx) => {
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          })
        }
        await tx.product.update({
          where: { id: item.productIdRef ?? '' },
          data: { soldCount: { decrement: item.quantity } },
        })
      }
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          paymentStatus: 'REFUNDED',
        },
      })
      await tx.orderStatusHistory.create({
        data: { orderId, status: 'CANCELLED', note: reason, createdAt: new Date() },
      })
    })
    const canceledSummary = await this.toSummary(orderId)
    if (!canceledSummary) throw new Error('Order summary unavailable')

    // Trigger cancellation email
    emailService.sendOrderStatusUpdate(orderId, 'CANCELLED', reason).catch(console.error)

    return canceledSummary
  },

  async addNote(orderId: string, note: string, isInternal = false): Promise<void> {
    await db.orderNote.create({ data: { orderId, note, isInternal } })
  },

  async reorder(orderId: string, ctx: { userId?: string; guestToken?: string }): Promise<CartLine[]> {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true, variant: true } } },
    })
    if (!order) throw new Error('الطلب غير موجود')

    for (const item of order.items) {
      if (!item.product?.isActive) continue
      await cartService.add(ctx, item.productIdRef!, item.variantId, item.quantity)
    }
    return cartService.getLines(ctx)
  },

  async toSummary(orderId: string): Promise<OrderSummary | null> {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: { select: { slug: true } } } },
        address: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    })
    if (!order) return null
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status as OrderStatus,
      paymentStatus: order.paymentStatus as PaymentStatus,
      fulfillmentStatus: order.fulfillmentStatus as any,
      subtotal: order.subtotal,
      discount: order.discount,
      shippingCost: order.shippingCost,
      tax: order.tax,
      total: order.total,
      currency: order.currency,
      couponCode: order.couponCode,
      shippingMethod: order.shippingMethod,
      trackingNumber: order.trackingNumber,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map(i => ({
        id: i.id,
        name: i.name,
        sku: i.sku,
        variantName: i.variantName,
        price: i.price,
        quantity: i.quantity,
        total: i.total,
        imageUrl: i.imageUrl,
        slug: i.product?.slug ?? null,
      })),
      address: order.address ? {
        firstName: order.address.firstName,
        lastName: order.address.lastName,
        email: order.address.email,
        phone: order.address.phone,
        address1: order.address.address1,
        city: order.address.city,
        country: order.address.country,
      } : null,
      timeline: order.statusHistory.map(t => ({
        id: t.id,
        status: t.status as OrderStatus,
        note: t.note,
        createdAt: t.createdAt.toISOString(),
      })),
    }
  },

  async adminMetrics(): Promise<{
    revenue: number
    ordersCount: number
    customersCount: number
    avgOrderValue: number
    revenueSeries: { date: string; value: number }[]
    ordersByStatus: { status: string; count: number; color: string }[]
    topProducts: { id: string; name: string; sold: number; revenue: number }[]
    recentOrders: { id: string; orderNumber: string; customer: string; total: number; status: OrderStatus; createdAt: string }[]
  }> {
    const orders = await db.order.findMany({
      where: { status: { not: 'CANCELLED' } },
      include: { items: true, address: true },
      orderBy: { createdAt: 'desc' },
    })
    const revenue = orders.reduce((s, o) => s + o.total, 0)
    const ordersCount = orders.length
    const customersCount = await db.user.count({ where: { role: 'CUSTOMER' } })
    const avgOrderValue = ordersCount > 0 ? revenue / ordersCount : 0

    // Revenue series (last 14 days)
    const days = 14
    const revenueSeries: { date: string; value: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dayStart = new Date(date.setHours(0, 0, 0, 0))
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)
      const dayRevenue = orders
        .filter(o => o.createdAt >= dayStart && o.createdAt < dayEnd)
        .reduce((s, o) => s + o.total, 0)
      revenueSeries.push({
        date: dayStart.toISOString().slice(0, 10),
        value: dayRevenue,
      })
    }

    // Orders by status
    const statusColors: Record<string, string> = {
      PENDING: '#f59e0b',
      CONFIRMED: '#3b82f6',
      PROCESSING: '#8b5cf6',
      SHIPPED: '#06b6d4',
      DELIVERED: '#10b981',
      CANCELLED: '#ef4444',
      REFUNDED: '#6b7280',
      ON_HOLD: '#9ca3af',
    }
    const statusCounts = new Map<string, number>()
    orders.forEach(o => statusCounts.set(o.status, (statusCounts.get(o.status) ?? 0) + 1))
    const allStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']
    const ordersByStatus = allStatuses.map(s => ({
      status: s,
      count: statusCounts.get(s) ?? 0,
      color: statusColors[s] ?? '#9ca3af',
    }))

    // Top products
    const productSales = new Map<string, { name: string; sold: number; revenue: number }>()
    orders.forEach(o => {
      o.items.forEach(item => {
        const key = item.productIdRef ?? item.sku
        const existing = productSales.get(key) ?? { name: item.name, sold: 0, revenue: 0 }
        existing.sold += item.quantity
        existing.revenue += item.total
        productSales.set(key, existing)
      })
    })
    const topProducts = Array.from(productSales.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // Recent orders
    const recentOrders = orders.slice(0, 8).map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customer: o.address ? `${o.address.firstName} ${o.address.lastName}` : (o.guestEmail ?? 'عميل'),
      total: o.total,
      status: o.status as OrderStatus,
      createdAt: o.createdAt.toISOString(),
    }))

    return {
      revenue,
      ordersCount,
      customersCount,
      avgOrderValue,
      revenueSeries,
      ordersByStatus,
      topProducts,
      recentOrders,
    }
  },
}

function statusToNote(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    PENDING: 'تم استلام الطلب',
    CONFIRMED: 'تم تأكيد الطلب',
    PROCESSING: 'جاري تجهيز الطلب',
    SHIPPED: 'تم شحن الطلب',
    DELIVERED: 'تم التوصيل',
    CANCELLED: 'تم إلغاء الطلب',
    REFUNDED: 'تم استرجاع المبلغ',
    ON_HOLD: 'الطلب معلق',
  }
  return map[status] ?? status
}
