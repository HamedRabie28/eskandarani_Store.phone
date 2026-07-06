/**
 * Cart Service — manages cart lifecycle, line items, and totals.
 * Supports both authenticated (userId) and guest (guestToken) carts.
 */
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import type { CartLine, CartSummary } from '@/types'

export interface CartContext {
  userId?: string
  guestToken?: string
}

async function getOrCreateCart(ctx: CartContext) {
  if (ctx.userId) {
    const existing = await db.cart.findUnique({ where: { userId: ctx.userId } })
    if (existing) return existing
    return db.cart.create({ data: { userId: ctx.userId } })
  }
  if (ctx.guestToken) {
    const existing = await db.cart.findUnique({ where: { guestToken: ctx.guestToken } })
    if (existing) return existing
    return db.cart.create({ data: { guestToken: ctx.guestToken } })
  }
  throw new Error('Cart context requires userId or guestToken')
}

function cartToken(cart: any) {
  return cart.guestToken ?? cart.userId ?? cart.id
}

export const cartService = {
  async getLines(ctx: CartContext): Promise<CartLine[]> {
    const cart = await getOrCreateCart(ctx)
    const items = await db.cartItem.findMany({
      where: { cartId: cart.id },
      include: {
        product: { include: { images: { take: 1, orderBy: { sortOrder: 'asc' } } } },
        variant: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return items.map(i => ({
      id: i.id,
      productId: i.productId,
      variantId: i.variantId,
      name: i.product.name,
      slug: i.product.slug,
      imageUrl: i.product.images[0]?.url ?? null,
      sku: i.variant?.sku ?? i.product.sku,
      variantName: i.variant?.name ?? null,
      price: i.price,
      quantity: i.quantity,
      stock: i.variant ? Math.max(0, i.variant.stock - i.variant.reservedStock) : 0,
      maxQuantity: Math.min(99, i.variant ? Math.max(0, i.variant.stock - i.variant.reservedStock) : 99),
    }))
  },

  async add(ctx: CartContext, productId: string, variantId: string | null, quantity: number): Promise<CartLine[]> {
    if (quantity < 1) throw new Error('الكمية يجب أن تكون 1 على الأقل')

    const product = await db.product.findFirst({
      where: { id: productId, isActive: true, deletedAt: null },
      include: { variants: { where: { isActive: true } } },
    })
    if (!product) throw new Error('المنتج غير متوفر')

    const variant = variantId
      ? product.variants.find(v => v.id === variantId)
      : product.variants[0]
    if (!variant) throw new Error('النسخة غير متوفرة')

    const available = variant.stock - variant.reservedStock
    if (available < quantity) throw new Error(`الكمية المتاحة: ${available}`)

    const unitPrice = variant.price ?? product.price
    const cart = await getOrCreateCart(ctx)

    // Use transaction to update cart item and create/update reservation atomically
    const token = cartToken(cart)
    await db.$transaction(async (tx) => {
      const existing = await tx.cartItem.findFirst({ where: { cartId: cart.id, productId, variantId: variantId ?? null } })
      if (existing) {
        const newQty = existing.quantity + quantity
        if (newQty > available) throw new Error(`الكمية المتاحة: ${available}`)
        await tx.cartItem.update({ where: { id: existing.id }, data: { quantity: newQty } })
        // update reservation
        const res = await tx.inventoryReservation.findFirst({ where: { variantId: variant.id, token } })
        if (res) {
          await tx.inventoryReservation.update({ where: { id: res.id }, data: { quantity: { increment: quantity } } })
        } else {
          await tx.inventoryReservation.create({ data: { variantId: variant.id, quantity, token, expiresAt: new Date(Date.now() + 1000 * 60 * 30) } })
        }
      } else {
        await tx.cartItem.create({ data: { cartId: cart.id, productId, variantId, quantity, price: unitPrice } })
        await tx.inventoryReservation.create({ data: { variantId: variant.id, quantity, token, expiresAt: new Date(Date.now() + 1000 * 60 * 30) } })
      }
      // increment reservedStock on variant
      await tx.productVariant.update({ where: { id: variant.id }, data: { reservedStock: { increment: quantity } } })
    })

    return this.getLines(ctx)
  },

  async update(ctx: CartContext, lineId: string, quantity: number): Promise<CartLine[]> {
    if (quantity < 1) throw new Error('الكمية غير صحيحة')
    const line = await db.cartItem.findUnique({ where: { id: lineId }, include: { variant: true } })
    if (!line) throw new Error('العنصر غير موجود في السلة')

    const available = line.variant ? Math.max(0, line.variant.stock - line.variant.reservedStock) : 99
    const cart = await getOrCreateCart(ctx)
    const token = cartToken(cart)
    const delta = quantity - line.quantity
    if (delta === 0) return this.getLines(ctx)
    if (delta > 0 && quantity > available) throw new Error(`الكمية المتاحة: ${available}`)

    await db.$transaction(async (tx) => {
      await tx.cartItem.update({ where: { id: lineId }, data: { quantity } })
      if (line.variant) {
        const res = await tx.inventoryReservation.findFirst({ where: { variantId: line.variant.id, token } })
        if (delta > 0) {
          if (res) {
            await tx.inventoryReservation.update({ where: { id: res.id }, data: { quantity: { increment: delta } } })
          } else {
            await tx.inventoryReservation.create({ data: { variantId: line.variant.id, quantity: delta, token, expiresAt: new Date(Date.now() + 1000 * 60 * 30) } })
          }
          await tx.productVariant.update({ where: { id: line.variant.id }, data: { reservedStock: { increment: delta } } })
        } else {
          // decrease reservation
          const dec = Math.min(res?.quantity ?? 0, -delta)
          if (res && dec > 0) {
            if (res.quantity - dec <= 0) {
              await tx.inventoryReservation.delete({ where: { id: res.id } })
            } else {
              await tx.inventoryReservation.update({ where: { id: res.id }, data: { quantity: { decrement: dec } } })
            }
            await tx.productVariant.update({ where: { id: line.variant.id }, data: { reservedStock: { decrement: dec } } })
          }
        }
      }
    })

    return this.getLines(ctx)
  },

  async remove(ctx: CartContext, lineId: string): Promise<CartLine[]> {
    const cart = await getOrCreateCart(ctx)
    const token = cartToken(cart)
    const line = await db.cartItem.findUnique({ where: { id: lineId }, include: { variant: true } })
    if (!line) throw new Error('العنصر غير موجود')
    await db.$transaction(async (tx) => {
      await tx.cartItem.delete({ where: { id: lineId } })
      if (line.variant) {
        const res = await tx.inventoryReservation.findFirst({ where: { variantId: line.variant.id, token } })
        const dec = Math.min(res?.quantity ?? 0, line.quantity)
        if (res && dec > 0) {
          if (res.quantity - dec <= 0) await tx.inventoryReservation.delete({ where: { id: res.id } })
          else await tx.inventoryReservation.update({ where: { id: res.id }, data: { quantity: { decrement: dec } } })
          await tx.productVariant.update({ where: { id: line.variant.id }, data: { reservedStock: { decrement: dec } } })
        }
      }
    })
    return this.getLines(ctx)
  },

  async clear(ctx: CartContext): Promise<void> {
    const cart = await getOrCreateCart(ctx)
    const token = cartToken(cart)
    // Find reservations for this cart token and remove them safely
    await db.$transaction(async (tx) => {
      const reservations = await tx.inventoryReservation.findMany({ where: { token } })
      for (const r of reservations) {
        await tx.productVariant.update({ where: { id: r.variantId }, data: { reservedStock: { decrement: r.quantity } } })
      }
      await tx.inventoryReservation.deleteMany({ where: { token } })
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } })
    })
  },

  async applyCoupon(ctx: CartContext, code: string): Promise<void> {
    const cart = await getOrCreateCart(ctx)
    await db.cart.update({ where: { id: cart.id }, data: { couponCode: code } })
  },

  async removeCoupon(ctx: CartContext): Promise<void> {
    const cart = await getOrCreateCart(ctx)
    await db.cart.update({ where: { id: cart.id }, data: { couponCode: null } })
  },

  async getCouponCode(ctx: CartContext): Promise<string | null> {
    const cart = await getOrCreateCart(ctx)
    return cart.couponCode
  },

  computeSummary(lines: CartLine[], opts: { shippingCost?: number; discount?: number; freeShipping?: boolean; taxRate?: number } = {}): CartSummary {
    const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0)
    const totalSavings = lines.reduce((s, l) => s + (l.price < (l as any).comparePrice ? 0 : 0), 0) // placeholder, real savings on compare price if available
    const discount = opts.discount ?? 0
    const shippingCost = opts.freeShipping ? 0 : (opts.shippingCost ?? 0)
    const taxRate = opts.taxRate ?? 0
    const taxableBase = Math.max(0, subtotal - discount)
    const tax = Math.round(taxableBase * taxRate)
    const total = Math.max(0, taxableBase + shippingCost + tax)
    const itemCount = lines.reduce((s, l) => s + l.quantity, 0)
    return {
      subtotal,
      discount,
      shippingCost,
      tax,
      total,
      currency: 'EGP',
      itemCount,
      totalSavings,
    }
  },

  async mergeGuestToUser(guestToken: string, userId: string): Promise<void> {
    const guestCart = await db.cart.findUnique({ where: { guestToken }, include: { items: true } })
    if (!guestCart || guestCart.items.length === 0) {
      // Just delete empty guest cart
      if (guestCart) await db.cart.delete({ where: { id: guestCart.id } })
      return
    }
    const userCart = await getOrCreateCart({ userId })

    // Use a transaction to merge safely
    await db.$transaction(async (tx) => {
      for (const item of guestCart.items) {
        const existing = await tx.cartItem.findFirst({
          where: { cartId: userCart.id, productId: item.productId, variantId: item.variantId ?? null },
        })
        if (existing) {
          await tx.cartItem.update({ where: { id: existing.id }, data: { quantity: { increment: item.quantity } } })
        } else {
          await tx.cartItem.create({
            data: { cartId: userCart.id, productId: item.productId, variantId: item.variantId, quantity: item.quantity, price: item.price },
          })
        }
      }
      await tx.cartItem.deleteMany({ where: { cartId: guestCart.id } })
      await tx.cart.delete({ where: { id: guestCart.id } })
    })
  },
}
