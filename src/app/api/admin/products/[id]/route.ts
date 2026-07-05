/**
 * GET    /api/admin/products/[id] — fetch single product for editing
 * PATCH  /api/admin/products/[id] — update product (with images & variants sync)
 * DELETE /api/admin/products/[id] — soft delete
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const product = await db.product.findUnique({
      where: { id },
      include: {
        brand: true,
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: { orderBy: { price: 'asc' } },
      },
    })
    if (!product) return NextResponse.json({ error: 'المنتج غير موجود' }, { status: 404 })
    return NextResponse.json({ product })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'فشل' }, { status: 500 })
  }
}

const fullUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().optional(),
  sku: z.string().min(2).optional(),
  description: z.string().optional(),
  longDescription: z.string().optional(),
  brandId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  price: z.number().min(0).optional(),
  comparePrice: z.number().nullable().optional(),
  costPrice: z.number().nullable().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
  isOnSale: z.boolean().optional(),
  weight: z.number().nullable().optional(),
  dimensions: z.string().nullable().optional(),
  warranty: z.string().nullable().optional(),
  tags: z.string().nullable().optional(),
  images: z.array(z.object({
    id: z.string().optional(),
    url: z.string(),
    altText: z.string().optional(),
    sortOrder: z.number().int().default(0),
  })).optional(),
  variants: z.array(z.object({
    id: z.string().optional(),
    name: z.string(),
    sku: z.string(),
    price: z.number().nullable().optional(),
    stock: z.number().int().min(0).default(0),
    attributes: z.string().nullable().optional(),
    isActive: z.boolean().default(true),
  })).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const parsed = fullUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'بيانات غير صحيحة', details: parsed.error.flatten() }, { status: 400 })
    }
    const d = parsed.data
    const { images: imagesInput, variants: variantsInput, ...productData } = d

    // Use a transaction to sync images and variants atomically
    const product = await db.$transaction(async (tx) => {
      // Update basic product fields
      const updated = await tx.product.update({
        where: { id },
        data: productData,
      })

      // Sync images if provided
      if (imagesInput) {
        // Delete existing images not in the new list
        const newIds = imagesInput.filter(i => i.id).map(i => i.id!)
        await tx.productImage.deleteMany({
          where: { productId: id, ...(newIds.length > 0 ? { id: { notIn: newIds } } : {}) },
        })
        // Upsert images
        for (let i = 0; i < imagesInput.length; i++) {
          const img = imagesInput[i]
          if (img.id) {
            await tx.productImage.update({
              where: { id: img.id },
              data: { url: img.url, altText: img.altText, sortOrder: img.sortOrder ?? i },
            })
          } else {
            await tx.productImage.create({
              data: { productId: id, url: img.url, altText: img.altText, sortOrder: img.sortOrder ?? i },
            })
          }
        }
      }

      // Sync variants if provided
      if (variantsInput) {
        const newIds = variantsInput.filter(v => v.id).map(v => v.id!)
        await tx.productVariant.deleteMany({
          where: { productId: id, ...(newIds.length > 0 ? { id: { notIn: newIds } } : {}) },
        })
        for (const v of variantsInput) {
          if (v.id) {
            await tx.productVariant.update({
              where: { id: v.id },
              data: {
                name: v.name, sku: v.sku, price: v.price, stock: v.stock,
                attributes: v.attributes, isActive: v.isActive,
              },
            })
          } else {
            await tx.productVariant.create({
              data: {
                productId: id, name: v.name, sku: v.sku, price: v.price, stock: v.stock,
                attributes: v.attributes, isActive: v.isActive,
              },
            })
          }
        }
      }

      return tx.product.findUnique({
        where: { id },
        include: { images: { orderBy: { sortOrder: 'asc' } }, variants: { orderBy: { price: 'asc' } }, brand: true, category: true },
      })
    })

    return NextResponse.json({ product })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'فشل التحديث' }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    // Soft delete
    await db.product.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'فشل الحذف' }, { status: 400 })
  }
}
