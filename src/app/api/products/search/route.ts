/**
 * GET /api/products/search — Fuzzy search with smart suggestions
 * Supports tolerance for typos and partial matches.
 * 
 * ?q=اسم المنتج        — text search query
 * ?limit=10            — max results (default 10, max 20)
 * ?suggestions=true    — return suggestions array only (for autocomplete)
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Simple fuzzy matching utility
function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }
  return dp[m][n]
}

function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase().trim()
  const t = target.toLowerCase()

  // Exact match
  if (t === q) return 1.0
  // Contains match
  if (t.includes(q)) return 0.9
  // Word starts with query
  if (t.startsWith(q)) return 0.85
  // Any word starts with query
  const words = t.split(/\s+/)
  if (words.some(w => w.startsWith(q))) return 0.8

  // Levenshtein distance fuzzy match
  const distance = levenshteinDistance(q, t.substring(0, q.length + 2))
  const tolerance = Math.max(1, Math.floor(q.length / 4)) // 1 error per 4 chars
  if (distance <= tolerance) return 0.7 - (distance * 0.1)

  return 0
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const query = sp.get('q')?.trim() ?? ''
    const limit = Math.min(Number(sp.get('limit') ?? 10), 20)
    const suggestionsOnly = sp.get('suggestions') === 'true'

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [], suggestions: [], total: 0 })
    }

    // Fetch candidate products from DB using basic DB-level filtering
    // We fetch more than needed to apply fuzzy scoring client-side
    const candidates = await db.product.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        OR: [
          // DB-level partial matches for initial filtering
          { name: { contains: query.substring(0, Math.min(query.length, 3)) } },
          { sku: { contains: query } },
          { description: { contains: query.substring(0, Math.min(query.length, 3)) } },
          { brand: { name: { contains: query.substring(0, Math.min(query.length, 3)) } } },
          { tags: { contains: query.substring(0, Math.min(query.length, 3)) } },
        ]
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        comparePrice: true,
        currency: true,
        sku: true,
        brand: { select: { name: true } },
        category: { select: { name: true } },
        images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } },
        variants: { where: { isActive: true }, select: { stock: true, reservedStock: true } },
        isBestSeller: true,
        isFeatured: true,
        isOnSale: true,
        rating: true,
        reviewCount: true,
        soldCount: true,
      },
      take: 100, // Fetch 100, apply fuzzy on those
    })

    // Apply fuzzy scoring
    const scored = candidates
      .map(p => {
        const nameScore = fuzzyScore(query, p.name)
        const brandScore = p.brand?.name ? fuzzyScore(query, p.brand.name) * 0.5 : 0
        const skuScore = fuzzyScore(query, p.sku) * 0.3
        const score = Math.max(nameScore, brandScore, skuScore)
        return { product: p, score }
      })
      .filter(x => x.score > 0)
      .sort((a, b) => {
        // Prioritize by: fuzzy score, then sales
        if (Math.abs(b.score - a.score) > 0.05) return b.score - a.score
        return b.product.soldCount - a.product.soldCount
      })
      .slice(0, limit)

    if (suggestionsOnly) {
      const suggestions = scored.slice(0, 8).map(x => ({
        id: x.product.id,
        name: x.product.name,
        slug: x.product.slug,
        price: x.product.price,
        currency: x.product.currency,
        imageUrl: x.product.images[0]?.url ?? null,
        brandName: x.product.brand?.name ?? null,
        score: x.score,
      }))
      return NextResponse.json({ suggestions })
    }

    const results = scored.map(({ product: p, score }) => {
      const totalStock = p.variants.reduce((s, v) => s + Math.max(0, v.stock - v.reservedStock), 0)
      const discount = p.comparePrice && p.comparePrice > p.price
        ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100)
        : null
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        comparePrice: p.comparePrice,
        currency: p.currency,
        imageUrl: p.images[0]?.url ?? null,
        brandName: p.brand?.name ?? null,
        categoryName: p.category?.name ?? null,
        inStock: totalStock > 0,
        discountPercent: discount,
        rating: p.rating,
        reviewCount: p.reviewCount,
        isOnSale: p.isOnSale,
        isFeatured: p.isFeatured,
        isBestSeller: p.isBestSeller,
        relevanceScore: score,
      }
    })

    return NextResponse.json({
      results,
      total: results.length,
      query,
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'فشل البحث' }, { status: 500 })
  }
}
