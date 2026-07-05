/**
 * ProductDetailPage — gallery + zoom, sticky buy box, variants, specs, reviews, related.
 * FIXED: addRecentlyViewed moved to useEffect (was causing infinite re-renders).
 * FIXED: native <img> tags instead of next/image for fast local image loading.
 */
'use client'

import { useProduct, useAddToCart } from '@/shared/hooks/queries'
import { useUIStore } from '@/shared/stores/ui.store'
import { useWishlistStore } from '@/shared/stores/wishlist.store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProductCard } from '@/shared/components/product-card'
import { Star, Heart, ShoppingCart, Minus, Plus, Truck, Shield, RefreshCw, Check, ChevronLeft, ZoomIn, Package, Loader2 } from 'lucide-react'
import { formatPrice } from '@/lib/format'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function ProductDetailPage({ slug }: { slug: string }) {
  // Key-based remount: when slug changes, the inner component remounts and all state resets naturally.
  // This avoids the lint violation of setState-in-effect for resetting selection state.
  return <ProductDetailInner key={slug} slug={slug} />
}

function ProductDetailInner({ slug }: { slug: string }) {
  const { data: product, isLoading, isError } = useProduct(slug)
  const { setView, openCartDrawer, addRecentlyViewed } = useUIStore()
  const wishlist = useWishlistStore()
  const addToCart = useAddToCart()
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [zoomed, setZoomed] = useState(false)

  // Track recently viewed product — sync with external store (zustand persist)
  useEffect(() => {
    if (product?.id) {
      addRecentlyViewed(product.id)
    }
  }, [product?.id, addRecentlyViewed])

  if (isLoading) {
    return (
      <div className="container-x section-y">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="aspect-square skeleton-shimmer rounded-3xl" />
          <div className="space-y-4">
            <div className="h-8 w-1/3 skeleton-shimmer rounded" />
            <div className="h-6 w-3/4 skeleton-shimmer rounded" />
            <div className="h-12 w-1/4 skeleton-shimmer rounded" />
            <div className="h-24 w-full skeleton-shimmer rounded" />
            <div className="h-12 w-full skeleton-shimmer rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (isError || !product) {
    return (
      <div className="container-x section-y text-center">
        <Package className="size-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">المنتج غير موجود</h2>
        <Button onClick={() => setView('products')}>العودة للمنتجات</Button>
      </div>
    )
  }

  const inWishlist = wishlist.has(product.id)
  const variant = product.variants.find(v => v.id === selectedVariant) ?? product.variants[0]
  const unitPrice = variant?.price ?? product.price
  const availableStock = variant ? Math.max(0, variant.stock - (variant.reservedStock ?? 0)) : product.inStock ? 99 : 0
  const inStock = availableStock > 0
  const maxQty = variant ? Math.min(99, availableStock) : 99
  const mainImage = product.images[selectedImage]?.url ?? product.imageUrl

  const handleAddToCart = () => {
    if (!inStock) {
      toast.error('المنتج غير متوفر')
      return
    }
    addToCart.mutate({
      productId: product.id,
      variantId: variant?.id ?? null,
      quantity,
    }, {
      onSuccess: () => {
        toast.success('تمت الإضافة للسلة', { description: `${quantity}× ${product.name}` })
        openCartDrawer()
      },
      onError: (err: any) => toast.error(err.message),
    })
  }

  const handleBuyNow = () => {
    if (!inStock) {
      toast.error('المنتج غير متوفر')
      return
    }
    addToCart.mutate({
      productId: product.id,
      variantId: variant?.id ?? null,
      quantity,
    }, {
      onSuccess: () => {
        useUIStore.getState().closeCartDrawer()
        setView('checkout')
      },
    })
  }

  return (
    <div className="container-x section-y-sm">
      {/* Breadcrumb */}
      <nav className="text-xs text-muted-foreground mb-4 flex items-center gap-1 flex-wrap">
        <button onClick={() => setView('home')} className="hover:text-primary">الرئيسية</button>
        <ChevronLeft className="size-3" />
        <button onClick={() => setView('products')} className="hover:text-primary">المنتجات</button>
        <ChevronLeft className="size-3" />
        {product.brandName && <><span>{product.brandName}</span><ChevronLeft className="size-3" /></>}
        <span className="text-foreground line-clamp-1">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-6 lg:gap-10">
        {/* Gallery — FIXED: native img for fast loading */}
        <div className="lg:sticky lg:top-32 lg:self-start">
          <div
            className="relative aspect-square rounded-3xl overflow-hidden bg-muted cursor-zoom-in"
            onMouseEnter={() => setZoomed(true)}
            onMouseLeave={() => setZoomed(false)}
          >
            {/* FIXED: use native img for instant local image loading (no next/image optimization overhead in dev) */}
            <img
              src={mainImage ?? '/products/placeholder.svg'}
              alt={product.images[selectedImage]?.altText ?? product.name}
              className={cn("w-full h-full object-cover transition-transform duration-300", zoomed && "scale-150")}
              loading="eager"
            />
            {/* Badges */}
            <div className="absolute top-4 right-4 flex flex-col gap-1.5">
              {product.discountPercent && <Badge className="badge-sale">خصم {product.discountPercent}%</Badge>}
              {product.isNewArrival && <Badge className="badge-new">جديد</Badge>}
              {product.isBestSeller && <Badge className="badge-best">الأكثر مبيعاً</Badge>}
            </div>
            <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur rounded-full p-2 text-xs flex items-center gap-1">
              <ZoomIn className="size-3" /> مرر للتكبير
            </div>
          </div>
          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
              {product.images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(i)}
                  className={cn(
                    "size-16 lg:size-20 rounded-xl overflow-hidden border-2 shrink-0 transition-all",
                    selectedImage === i ? "border-primary shadow-soft" : "border-border opacity-70 hover:opacity-100"
                  )}
                >
                  <img src={img.url} alt={img.altText ?? product.name} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.brandName && (
            <button
              onClick={() => { useUIStore.getState().setProductFilters({ brandIds: [] }); setView('products') }}
              className="text-sm text-primary font-semibold mb-1 hover:underline"
            >
              {product.brandName}
            </button>
          )}
          <h1 className="font-display text-2xl lg:text-3xl font-extrabold mb-3">{product.name}</h1>

          {/* Rating */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className={cn("size-4", i <= Math.round(product.rating) ? "text-warning fill-warning" : "text-muted-foreground/30")} />
              ))}
              <span className="text-sm font-semibold mr-1">{product.rating.toFixed(1)}</span>
            </div>
            <span className="text-sm text-muted-foreground">({product.reviewCount} تقييم)</span>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-sm text-muted-foreground">{product.soldCount} مبيع</span>
          </div>

          {/* Price */}
          <div className="flex items-center gap-3 mb-5">
            <span className="font-display text-3xl lg:text-4xl font-extrabold text-primary">{formatPrice(unitPrice)}</span>
            {product.comparePrice && product.comparePrice > unitPrice && (
              <>
                <span className="text-lg text-muted-foreground line-through">{formatPrice(product.comparePrice)}</span>
                <Badge className="badge-sale">وفّر {formatPrice(product.comparePrice - unitPrice)}</Badge>
              </>
            )}
          </div>

          {/* Stock */}
          <div className="mb-4">
            {inStock ? (
              <Badge variant="outline" className="text-success border-success/30 bg-success/5 gap-1">
                <Check className="size-3" /> متوفر في المخزون
              </Badge>
            ) : (
              <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5">
                غير متوفر حالياً
              </Badge>
            )}
            {variant && availableStock <= 5 && availableStock > 0 && (
              <span className="text-xs text-warning mr-2">باقي {availableStock} قطع فقط!</span>
            )}
          </div>

          {/* Variants */}
          {product.variants.length > 1 && (
            <div className="mb-5">
              <div className="text-sm font-semibold mb-2">الخيارات المتاحة</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {product.variants.map(v => {
                  const variantAvailable = Math.max(0, v.stock - (v.reservedStock ?? 0))
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v.id)}
                      disabled={variantAvailable === 0}
                      className={cn(
                        "p-3 rounded-xl border text-right transition-all disabled:opacity-50",
                        (variant?.id === v.id) ? "border-primary bg-accent shadow-soft" : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="text-xs font-medium line-clamp-1">{v.name}</div>
                      <div className="text-xs text-primary font-bold mt-1">
                        {v.price ? formatPrice(v.price) : formatPrice(product.price)}
                      </div>
                      {variantAvailable === 0 ? (
                        <div className="text-[10px] text-destructive mt-1">غير متوفر</div>
                      ) : variantAvailable <= 5 ? (
                        <div className="text-[10px] text-warning mt-1">باقي {variantAvailable}</div>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Quantity + Add to cart */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex items-center border rounded-xl h-12 shrink-0 overflow-hidden">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="size-12 grid place-items-center hover:bg-accent disabled:opacity-50"
                aria-label="نقص عدد المنتج"
              >
                <Minus className="size-4" />
              </button>
              <Input
                type="number"
                min={1}
                max={maxQty}
                value={quantity}
                onChange={(e) => {
                  const value = Number(e.target.value)
                  setQuantity(() => Math.max(1, Math.min(maxQty, Number.isNaN(value) ? 1 : value)))
                }}
                className="h-12 w-20 text-center border-x border-border rounded-none"
                inputMode="numeric"
                aria-label="عدد المنتج"
              />
              <button
                onClick={() => setQuantity(q => Math.min(maxQty, q + 1))}
                disabled={quantity >= maxQty}
                className="size-12 grid place-items-center hover:bg-accent disabled:opacity-50"
                aria-label="زيادة عدد المنتج"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <Button
              size="lg"
              className="flex-1 h-12 gap-2 shadow-glow"
              disabled={!inStock || addToCart.isPending}
              onClick={handleAddToCart}
            >
              {addToCart.isPending ? <Loader2 className="size-5 animate-spin" /> : <ShoppingCart className="size-5" />}
              {addToCart.isPending ? 'جاري الإضافة...' : 'أضف للسلة'}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-4"
              onClick={() => wishlist.toggle(product.id)}
              aria-label="المفضلة"
            >
              <Heart className={cn("size-5", inWishlist && "fill-destructive text-destructive")} />
            </Button>
          </div>

          <Button
            size="lg"
            variant="secondary"
            className="w-full h-12 mb-6 gap-2"
            disabled={!inStock || addToCart.isPending}
            onClick={handleBuyNow}
          >
            اشترِ الآن
          </Button>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3 mb-6 p-4 rounded-2xl bg-accent/30">
            {[
              { icon: Truck, title: 'شحن سريع', desc: '1-2 يوم' },
              { icon: Shield, title: 'ضمان', desc: product.warranty ?? 'سنة' },
              { icon: RefreshCw, title: 'استرجاع', desc: '14 يوم' },
            ].map((t, i) => (
              <div key={i} className="text-center">
                <t.icon className="size-6 mx-auto mb-1 text-primary" />
                <div className="text-xs font-semibold">{t.title}</div>
                <div className="text-[10px] text-muted-foreground">{t.desc}</div>
              </div>
            ))}
          </div>

          {/* SKU */}
          <div className="text-xs text-muted-foreground mb-2">
            <span className="font-semibold">SKU:</span> {product.sku}
          </div>
        </div>
      </div>

      {/* Tabs: description / specs / reviews */}
      <div className="mt-12">
        <Tabs defaultValue="description">
          <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 rounded-2xl">
            <TabsTrigger value="description" className="rounded-xl">الوصف</TabsTrigger>
            <TabsTrigger value="specs" className="rounded-xl">المواصفات</TabsTrigger>
            <TabsTrigger value="reviews" className="rounded-xl">التقييمات ({product.reviewCount})</TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="mt-4">
            <div className="prose prose-sm max-w-none">
              <p className="text-muted-foreground leading-relaxed">{product.description}</p>
              {product.longDescription && (
                <p className="text-muted-foreground leading-relaxed mt-3">{product.longDescription}</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="specs" className="mt-4">
            <div className="grid sm:grid-cols-2 gap-2">
              {product.specs.map((spec, i) => (
                <div key={i} className="flex justify-between p-3 rounded-xl bg-accent/30">
                  <span className="text-sm text-muted-foreground">{spec.label}</span>
                  <span className="text-sm font-medium">{spec.value}</span>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="mt-4">
            <div className="space-y-4">
              {/* Rating summary */}
              <div className="flex items-center gap-6 p-4 rounded-2xl bg-accent/30">
                <div className="text-center">
                  <div className="font-display text-5xl font-extrabold text-primary">{product.rating.toFixed(1)}</div>
                  <div className="flex gap-0.5 mt-1">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className={cn("size-3", i <= Math.round(product.rating) ? "text-warning fill-warning" : "text-muted-foreground/30")} />
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{product.reviewCount} تقييم</div>
                </div>
                <Separator orientation="vertical" className="h-20 hidden sm:block" />
                <div className="flex-1 hidden sm:block space-y-1">
                  {[5, 4, 3, 2, 1].map(s => (
                    <div key={s} className="flex items-center gap-2 text-xs">
                      <span className="w-3">{s}</span>
                      <Star className="size-3 text-warning fill-warning" />
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-warning"
                          style={{ width: `${s === 5 ? 70 : s === 4 ? 20 : s === 3 ? 7 : s === 2 ? 2 : 1}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviews list */}
              {product.reviews.length > 0 ? (
                <div className="grid gap-3">
                  {product.reviews.map(r => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl border border-border"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="size-8 rounded-full bg-primary/10 grid place-items-center text-xs font-bold text-primary">
                            {r.authorName.slice(0, 2)}
                          </div>
                          <div>
                            <div className="text-sm font-semibold">{r.authorName}</div>
                            {r.isVerified && <Badge variant="outline" className="text-[10px] py-0 h-4 text-success border-success/30">شراء موثّق</Badge>}
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(i => (
                            <Star key={i} className={cn("size-3", i <= r.rating ? "text-warning fill-warning" : "text-muted-foreground/30")} />
                          ))}
                        </div>
                      </div>
                      {r.title && <div className="font-semibold text-sm mb-1">{r.title}</div>}
                      {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">لا توجد تقييمات بعد. كن أول من يقيّم!</div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Related */}
      {product.related.length > 0 && (
        <div className="mt-12">
          <h2 className="font-display text-xl lg:text-2xl font-extrabold mb-5">منتجات ذات صلة</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
            {product.related.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </div>
      )}
    </div>
  )
}
