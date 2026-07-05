/**
 * GET    /api/admin/products — list all products with relations
 * POST   /api/admin/products — create full product with variants & images
 *        Body: { name, slug?, sku, description?, longDescription?, brandId?, categoryId?,
 *                price, comparePrice?, costPrice?, currency?, isActive?, isFeatured?,
 *                isBestSeller?, isNewArrival?, isOnSale?, weight?, dimensions?, warranty?,
 *                tags?, images: [{url, altText?, sortOrder?}], variants: [{name, sku, price?, stock, attributes?}] }
 * PATCH  /api/admin/products — update (uses [id] route)
 * DELETE /api/admin/products/[id] — soft delete
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

function slugify(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const search = sp.get('search') ?? undefined
    const brandId = sp.get('brandId') ?? undefined
    const categoryId = sp.get('categoryId') ?? undefined
    const isActive = sp.get('isActive')

    const products = await db.product.findMany({
      where: {
        deletedAt: null,
        ...(search ? { OR: [{ name: { contains: search } }, { sku: { contains: search } }] } : {}),
        ...(brandId ? { brandId } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(isActive === 'true' ? { isActive: true } : isActive === 'false' ? { isActive: false } : {}),
      },
      include: {
        brand: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        images: { orderBy: { sortOrder: 'asc' } },
        variants: { orderBy: { price: 'asc' } },
        _count: { select: { reviews: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return NextResponse.json({ products })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'فشل' }, { status: 500 })
  }
}

const imageSchema = z.object({
  url: z.string(),
  altText: z.string().optional(),
  sortOrder: z.number().int().default(0),
})

const variantSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  sku: z.string().min(1),
  price: z.number().nullable().optional(),
  stock: z.number().int().min(0).default(0),
  attributes: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
})

const createSchema = z.object({
  name: z.string().min(2, 'الاسم مطلوب'),
  slug: z.string().optional(),
  sku: z.string().min(2, 'SKU مطلوب'),
  description: z.string().optional(),
  longDescription: z.string().optional(),
  brandId: z.string().optional(),
  categoryId: z.string().optional(),
  price: z.number().min(0, 'السعر مطلوب'),
  comparePrice: z.number().nullable().optional(),
  costPrice: z.number().nullable().optional(),
  currency: z.string().default('EGP'),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  isOnSale: z.boolean().default(false),
  weight: z.number().nullable().optional(),
  dimensions: z.string().nullable().optional(),
  warranty: z.string().nullable().optional(),
  tags: z.string().nullable().optional(),
  images: z.array(imageSchema).default([]),
  variants: z.array(variantSchema).default([]),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'بيانات غير صحيحة', details: parsed.error.flatten() }, { status: 400 })
    }
    const d = parsed.data
    const slug = d.slug || slugify(d.name)

    // Validate uniqueness
    const existSlug = await db.product.findUnique({ where: { slug } })
    if (existSlug) return NextResponse.json({ error: 'الـ slug مستخدم بالفعل' }, { status: 400 })
    const existSku = await db.product.findUnique({ where: { sku: d.sku } })
    if (existSku) return NextResponse.json({ error: 'الـ SKU مستخدم بالفعل' }, { status: 400 })

    const product = await db.product.create({
      data: {
        name: d.name,
        slug,
        sku: d.sku,
        description: d.description,
        longDescription: d.longDescription,
        brandId: d.brandId,
        categoryId: d.categoryId,
        price: d.price,
        comparePrice: d.comparePrice,
        costPrice: d.costPrice,
        currency: d.currency,
        isActive: d.isActive,
        isFeatured: d.isFeatured,
        isBestSeller: d.isBestSeller,
        isNewArrival: d.isNewArrival,
        isOnSale: d.isOnSale,
        weight: d.weight,
        dimensions: d.dimensions,
        warranty: d.warranty,
        tags: d.tags,
        images: d.images.length > 0 ? { create: d.images } : undefined,
        variants: d.variants.length > 0 ? { create: d.variants.map(v => ({
          name: v.name, sku: v.sku, price: v.price, stock: v.stock,
          attributes: v.attributes, isActive: v.isActive,
        })) } : undefined,
      },
      include: { images: true, variants: true, brand: true, category: true },
    })
    return NextResponse.json({ product })
  } catch (e: any) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') {
        return NextResponse.json({ error: 'قيمة فريدة مكررة' }, { status: 400 })
      }
    }
    return NextResponse.json({ error: e.message ?? 'فشل الإنشاء' }, { status: 400 })
  }
}

const updateSchema = z.object({
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
})

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ error: 'معرّف المنتج مطلوب' }, { status: 400 })
    const parsed = updateSchema.safeParse(data)
    if (!parsed.success) {
      return NextResponse.json({ error: 'بيانات غير صحيحة', details: parsed.error.flatten() }, { status: 400 })
    }
    const product = await db.product.update({
      where: { id },
      data: parsed.data,
      include: { images: true, variants: true, brand: true, category: true },
    })
    return NextResponse.json({ product })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'فشل التحديث' }, { status: 400 })
  }
}
