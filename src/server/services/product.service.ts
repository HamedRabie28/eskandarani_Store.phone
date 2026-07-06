/**
 * Product Service — business logic for catalog browsing.
 * Delegates persistence to productRepository.
 */
import { productRepository, type ProductListFilters, type ProductListResult, type ProductListItem } from '@/server/repositories/product.repository'
import { db } from '@/lib/db'
import type { CategoryTreeNode, BrandData, ProductDetail, ProductCardData } from '@/types'

function toCardData(p: ProductListItem): ProductCardData {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    comparePrice: p.comparePrice,
    currency: p.currency,
    imageUrl: p.imageUrl,
    brandName: p.brandName,
    rating: p.rating,
    reviewCount: p.reviewCount,
    isFeatured: p.isFeatured,
    isBestSeller: p.isBestSeller,
    isNewArrival: p.isNewArrival,
    isOnSale: p.isOnSale,
    inStock: p.inStock,
    discountPercent: p.discountPercent,
  }
}

export const productService = {
  async list(filters: ProductListFilters): Promise<ProductListResult> {
    return productRepository.list(filters)
  },

  async featured(): Promise<ProductCardData[]> {
    return (await productRepository.featured(8)).map(toCardData)
  },

  async bestSellers(): Promise<ProductCardData[]> {
    return (await productRepository.bestSellers(8)).map(toCardData)
  },

  async newArrivals(): Promise<ProductCardData[]> {
    return (await productRepository.newArrivals(8)).map(toCardData)
  },

  async onSale(): Promise<ProductCardData[]> {
    return (await productRepository.onSale(8)).map(toCardData)
  },

  async bySlug(slug: string): Promise<ProductDetail | null> {
    const p = await productRepository.bySlug(slug)
    if (!p) return null

    const related = await productRepository.related(p.id, p.categoryId, 4)

    const totalStock = p.variants.reduce((s, v) => s + Math.max(0, v.stock - v.reservedStock), 0)
    const discount = p.comparePrice && p.comparePrice > p.price
      ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100)
      : null

    // Build specs from variant attributes + product metadata
    const specs: { label: string; value: string }[] = [
      { label: 'الماركة', value: p.brand?.name ?? '—' },
      { label: 'الفئة', value: p.category?.name ?? '—' },
      { label: 'SKU', value: p.sku },
      { label: 'الضمان', value: p.warranty ?? '—' },
      { label: 'الوزن', value: p.weight ? `${p.weight} كجم` : '—' },
      { label: 'الأبعاد', value: p.dimensions ?? '—' },
    ]

    // Extract unique attributes from variants
    const attrKeys = new Set<string>()
    p.variants.forEach(v => {
      if (v.attributes) {
        try { Object.keys(JSON.parse(v.attributes)).forEach(k => attrKeys.add(k)) } catch {}
      }
    })
    const attrLabels: Record<string, string> = {
      storage: 'التخزين',
      color: 'اللون',
      ram: 'الذاكرة',
      size: 'الحجم',
    }
    Array.from(attrKeys).forEach(k => {
      specs.push({ label: attrLabels[k] || k, value: 'متوفر عدة خيارات' })
    })

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      description: p.description ?? '',
      longDescription: p.longDescription,
      price: p.price,
      comparePrice: p.comparePrice,
      currency: p.currency,
      imageUrl: p.images[0]?.url ?? null,
      brandName: p.brand?.name ?? null,
      brandId: p.brandId,
      categoryId: p.categoryId,
      rating: p.rating,
      reviewCount: p.reviewCount,
      soldCount: p.soldCount,
      viewCount: p.viewCount,
      isFeatured: p.isFeatured,
      isBestSeller: p.isBestSeller,
      isNewArrival: p.isNewArrival,
      isOnSale: p.isOnSale,
      inStock: totalStock > 0,
      discountPercent: discount,
      weight: p.weight,
      dimensions: p.dimensions,
      warranty: p.warranty,
      images: p.images.map(img => ({
        id: img.id,
        url: img.url,
        altText: img.altText,
        sortOrder: img.sortOrder,
      })),
      variants: p.variants.map(v => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        price: v.price,
        stock: Math.max(0, v.stock - v.reservedStock),
        reservedStock: v.reservedStock,
        attributes: v.attributes ? safeParse(v.attributes) : null,
      })),
      reviews: p.reviews.map(r => ({
        id: r.id,
        authorName: r.authorName,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
        isVerified: r.isVerified,
      })),
      related: related.map(toCardData),
      specs,
    }
  },

  async categories(): Promise<CategoryTreeNode[]> {
    const cats = await db.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: 'asc' },
      include: { children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
    })
    const counts = await db.product.groupBy({
      by: ['categoryId'],
      where: { isActive: true, deletedAt: null },
      _count: { id: true },
    })
    const countMap = new Map(counts.map(c => [c.categoryId, c._count.id]))
    return cats.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      imageUrl: c.imageUrl,
      productCount: countMap.get(c.id) ?? 0,
      children: c.children.map(ch => ({
        id: ch.id,
        name: ch.name,
        slug: ch.slug,
        icon: ch.icon,
        imageUrl: ch.imageUrl,
        productCount: countMap.get(ch.id) ?? 0,
        children: [],
      })),
    }))
  },

  async brands(): Promise<BrandData[]> {
    const brands = await db.brand.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
    const counts = await db.product.groupBy({
      by: ['brandId'],
      where: { isActive: true, deletedAt: null },
      _count: { id: true },
    })
    const countMap = new Map(counts.map(c => [c.brandId ?? '', c._count.id]))
    return brands.map(b => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      logoUrl: b.logoUrl,
      productCount: countMap.get(b.id) ?? 0,
    }))
  },
}

function safeParse(s: string): Record<string, string> | null {
  try { return JSON.parse(s) } catch { return null }
}
