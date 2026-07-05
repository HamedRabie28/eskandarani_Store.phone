/**
 * ProductForm — full create/edit form for products.
 * Includes: basic info, pricing, flags, brand/category, variants editor, images.
 */
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useCreateProduct, useUpdateProduct, useAdminBrands, useAdminCategories, useAdminProduct } from '@/shared/hooks/admin-queries'
import { useUploadImage } from '@/shared/hooks/admin-queries'
import { MultiImageUpload, ImageUpload } from './image-upload'
import { Loader2, Save, X, Plus, Trash2, Package, DollarSign, Tag, Layers, Image as ImageIcon, Settings } from 'lucide-react'
import { toast } from 'sonner'

interface ProductFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId?: string | null
}

interface Variant {
  id?: string
  name: string
  sku: string
  price: number | null
  stock: number
  attributes: string | null
  isActive: boolean
}

interface ImageItem {
  id?: string
  url: string
  altText?: string
  sortOrder: number
}

export function ProductForm({ open, onOpenChange, productId }: ProductFormProps) {
  const isEdit = !!productId
  const { data: existing } = useAdminProduct(productId ?? null)
  const { data: brandsData } = useAdminBrands()
  const { data: categoriesData } = useAdminCategories()
  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()

  // Load existing product for editing using key-based remount pattern
  // Form state is initialized from existing.product on mount via lazy initializer
  // (relying on Dialog open state to remount the form)
  const existingProduct = existing?.product

  // Use a form key to force remount when product changes
  const formKey = isEdit ? (existingProduct?.id ?? 'new') : 'new'

  return (
    <ProductFormInner
      key={formKey}
      open={open}
      onOpenChange={onOpenChange}
      productId={productId}
      existingProduct={existingProduct}
      brandsData={brandsData}
      categoriesData={categoriesData}
      createMutation={createMutation}
      updateMutation={updateMutation}
    />
  )
}

function ProductFormInner({
  open, onOpenChange, productId, existingProduct, brandsData, categoriesData, createMutation, updateMutation,
}: any) {
  const isEdit = !!productId
  const [form, setForm] = useState(() => {
    if (existingProduct && isEdit) {
      const p = existingProduct
      return {
        name: p.name ?? '', slug: p.slug ?? '', sku: p.sku ?? '',
        description: p.description ?? '', longDescription: p.longDescription ?? '',
        brandId: p.brandId ?? '', categoryId: p.categoryId ?? '',
        price: p.price ?? 0, comparePrice: p.comparePrice ?? 0, costPrice: p.costPrice ?? 0,
        currency: p.currency ?? 'EGP', isActive: p.isActive ?? true,
        isFeatured: p.isFeatured ?? false, isBestSeller: p.isBestSeller ?? false,
        isNewArrival: p.isNewArrival ?? false, isOnSale: p.isOnSale ?? false,
        weight: p.weight ?? 0, dimensions: p.dimensions ?? '', warranty: p.warranty ?? '', tags: p.tags ?? '',
      }
    }
    return {
      name: '', slug: '', sku: '', description: '', longDescription: '',
      brandId: '', categoryId: '', price: 0, comparePrice: 0, costPrice: 0,
      currency: 'EGP', isActive: true, isFeatured: false, isBestSeller: false,
      isNewArrival: false, isOnSale: false, weight: 0, dimensions: '', warranty: '', tags: '',
    }
  })
  const [images, setImages] = useState<any[]>(
    existingProduct?.images?.map((img: any) => ({ id: img.id, url: img.url, altText: img.altText, sortOrder: img.sortOrder })) ?? []
  )
  const [variants, setVariants] = useState<any[]>(
    existingProduct?.variants?.map((v: any) => ({
      id: v.id, name: v.name, sku: v.sku, price: v.price, stock: v.stock,
      attributes: v.attributes, isActive: v.isActive,
    })) ?? []
  )

  const handleSave = async () => {
    if (!form.name || !form.sku || form.price <= 0) {
      toast.error('الاسم و SKU والسعر مطلوبة')
      return
    }
    const payload: any = {
      ...form,
      brandId: form.brandId || undefined,
      categoryId: form.categoryId || undefined,
      comparePrice: form.comparePrice > 0 ? form.comparePrice : null,
      costPrice: form.costPrice > 0 ? form.costPrice : null,
      weight: form.weight > 0 ? form.weight : null,
      dimensions: form.dimensions || null,
      warranty: form.warranty || null,
      tags: form.tags || null,
      images: images.map((img, i) => ({ ...img, sortOrder: i })),
      variants: variants.map(v => ({
        ...v,
        price: v.price ?? null,
        attributes: v.attributes || null,
      })),
    }
    if (isEdit && productId) {
      await updateMutation.mutateAsync({ id: productId, ...payload })
    } else {
      await createMutation.mutateAsync(payload)
    }
    onOpenChange(false)
  }

  const addVariant = () => {
    setVariants([...variants, {
      name: '', sku: `${form.sku}-${variants.length + 1}`.toUpperCase(), price: null,
      stock: 0, attributes: null, isActive: true,
    }])
  }

  const updateVariant = (i: number, field: keyof Variant, value: any) => {
    setVariants(variants.map((v, idx) => idx === i ? { ...v, [field]: value } : v))
  }

  const removeVariant = (i: number) => {
    setVariants(variants.filter((_, idx) => idx !== i))
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border bg-gradient-to-l from-accent/50 to-transparent">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="size-5 text-primary" />
            {isEdit ? 'تعديل المنتج' : 'إضافة منتج جديد'}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <section>
              <h3 className="font-bold flex items-center gap-2 mb-3 text-sm">
                <Settings className="size-4 text-primary" /> المعلومات الأساسية
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="اسم المنتج *" value={form.name} onChange={(v) => setForm({ ...form, name: v, slug: v ? form.slug : slugify(v) })} />
                <Field label="الـ Slug (URL)" value={form.slug} onChange={(v) => setForm({ ...form, slug: slugify(v) })} dir="ltr" />
                <Field label="SKU *" value={form.sku} onChange={(v) => setForm({ ...form, sku: v.toUpperCase() })} dir="ltr" />
                <div>
                  <Label className="text-xs">الماركة</Label>
                  <Select value={form.brandId || 'none'} onValueChange={(v) => setForm({ ...form, brandId: v === 'none' ? '' : v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— بدون —</SelectItem>
                      {brandsData?.brands.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">الفئة</Label>
                  <Select value={form.categoryId || 'none'} onValueChange={(v) => setForm({ ...form, categoryId: v === 'none' ? '' : v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— بدون —</SelectItem>
                      {categoriesData?.categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Field label="الضمان" value={form.warranty} onChange={(v) => setForm({ ...form, warranty: v })} />
              </div>
              <div className="mt-3">
                <Label className="text-xs">وصف مختصر</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="mt-1 resize-none" />
              </div>
              <div className="mt-3">
                <Label className="text-xs">وصف تفصيلي</Label>
                <Textarea value={form.longDescription} onChange={(e) => setForm({ ...form, longDescription: e.target.value })} rows={4} className="mt-1 resize-none" />
              </div>
            </section>

            <Separator />

            {/* Pricing */}
            <section>
              <h3 className="font-bold flex items-center gap-2 mb-3 text-sm">
                <DollarSign className="size-4 text-primary" /> التسعير
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field label="السعر *" type="number" value={String(form.price)} onChange={(v) => setForm({ ...form, price: Number(v) })} />
                <Field label="السعر قبل الخصم" type="number" value={String(form.comparePrice)} onChange={(v) => setForm({ ...form, comparePrice: Number(v) })} />
                <Field label="سعر التكلفة" type="number" value={String(form.costPrice)} onChange={(v) => setForm({ ...form, costPrice: Number(v) })} />
                <Field label="العملة" value={form.currency} onChange={(v) => setForm({ ...form, currency: v })} dir="ltr" />
              </div>
            </section>

            <Separator />

            {/* Flags */}
            <section>
              <h3 className="font-bold flex items-center gap-2 mb-3 text-sm">
                <Tag className="size-4 text-primary" /> الحالات والشارات
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { key: 'isActive', label: 'نشط' },
                  { key: 'isFeatured', label: 'مميز' },
                  { key: 'isBestSeller', label: 'الأكثر مبيعاً' },
                  { key: 'isNewArrival', label: 'وصل حديثاً' },
                  { key: 'isOnSale', label: 'عرض' },
                ].map(f => (
                  <label key={f.key} className="flex items-center gap-2 p-3 rounded-xl border border-border hover:border-primary/50 cursor-pointer">
                    <Checkbox
                      checked={(form as any)[f.key]}
                      onCheckedChange={(c) => setForm({ ...form, [f.key]: !!c } as any)}
                    />
                    <span className="text-sm">{f.label}</span>
                  </label>
                ))}
              </div>
            </section>

            <Separator />

            {/* Physical attributes */}
            <section>
              <h3 className="font-bold flex items-center gap-2 mb-3 text-sm">
                <Layers className="size-4 text-primary" /> المواصفات المادية
              </h3>
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="الوزن (كجم)" type="number" value={String(form.weight)} onChange={(v) => setForm({ ...form, weight: Number(v) })} />
                <Field label="الأبعاد" value={form.dimensions} onChange={(v) => setForm({ ...form, dimensions: v })} placeholder="15 × 7 × 0.8 cm" />
                <Field label="الوسوم (مفصولة بفاصلة)" value={form.tags} onChange={(v) => setForm({ ...form, tags: v })} />
              </div>
            </section>

            <Separator />

            {/* Images */}
            <section>
              <h3 className="font-bold flex items-center gap-2 mb-3 text-sm">
                <ImageIcon className="size-4 text-primary" /> صور المنتج
              </h3>
              <MultiImageUpload type="products" images={images} onChange={setImages} />
            </section>

            <Separator />

            {/* Variants */}
            <section>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <h3 className="font-bold flex items-center gap-2 text-sm">
                  <Layers className="size-4 text-primary" /> النسخ (Variants)
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">إجمالي المخزون: {variants.reduce((sum, v) => sum + Math.max(0, v.stock), 0)}</span>
                  <Button type="button" size="sm" variant="outline" onClick={addVariant} className="gap-1">
                    <Plus className="size-4" /> إضافة نسخة
                  </Button>
                </div>
              </div>
              {variants.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground bg-accent/30 rounded-xl">
                  لا توجد نسخ. سيتم بيع المنتج كنسخة افتراضية واحدة.
                </div>
              ) : (
                <div className="space-y-2">
                  {variants.map((v, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 p-3 rounded-xl border border-border items-end">
                      <div className="col-span-12 sm:col-span-3">
                        <Label className="text-[10px]">الاسم</Label>
                        <Input value={v.name} onChange={(e) => updateVariant(i, 'name', e.target.value)} className="h-9" placeholder="256GB - أسود" />
                      </div>
                      <div className="col-span-6 sm:col-span-3">
                        <Label className="text-[10px]">SKU</Label>
                        <Input value={v.sku} onChange={(e) => updateVariant(i, 'sku', e.target.value.toUpperCase())} className="h-9" dir="ltr" />
                      </div>
                      <div className="col-span-6 sm:col-span-2">
                        <Label className="text-[10px]">السعر</Label>
                        <Input type="number" min={0} value={v.price ?? ''} onChange={(e) => updateVariant(i, 'price', e.target.value ? Number(e.target.value) : null)} className="h-9" />
                      </div>
                      <div className="col-span-6 sm:col-span-2">
                        <Label className="text-[10px]">المخزون</Label>
                        <div className="flex items-center gap-1 mt-1">
                          <Button type="button" size="icon" variant="outline" className="size-9" onClick={() => updateVariant(i, 'stock', Math.max(0, v.stock - 1))} aria-label="نقص" disabled={v.stock <= 0}>
                            <Minus className="size-4" />
                          </Button>
                          <Input
                            type="number"
                            min={0}
                            value={v.stock}
                            onChange={(e) => updateVariant(i, 'stock', Math.max(0, Number(e.target.value) || 0))}
                            className="h-9 text-center"
                            inputMode="numeric"
                          />
                          <Button type="button" size="icon" variant="outline" className="size-9" onClick={() => updateVariant(i, 'stock', v.stock + 1)} aria-label="زيادة">
                            <Plus className="size-4" />
                          </Button>
                        </div>
                        {v.stock <= 5 && (
                          <p className="text-[10px] text-warning mt-1">المخزون منخفض للغاية: {v.stock} قطع</p>
                        )}
                      </div>
                      <div className="col-span-6 sm:col-span-2 flex items-center gap-1">
                        <label className="flex items-center gap-1 text-xs">
                          <Checkbox checked={v.isActive} onCheckedChange={(c) => updateVariant(i, 'isActive', !!c)} />
                          نشط
                        </label>
                        <Button type="button" size="icon" variant="ghost" onClick={() => removeVariant(i)} className="size-8 text-destructive" aria-label="حذف">
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </ScrollArea>
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2 bg-card">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="gap-1">
            <X className="size-4" /> إلغاء
          </Button>
          <Button onClick={handleSave} disabled={isPending} className="gap-2 shadow-glow">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isEdit ? 'حفظ التعديلات' : 'إضافة المنتج'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function slugify(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
}

function Field({
  label, value, onChange, error, type = 'text', placeholder, dir,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  type?: string
  placeholder?: string
  dir?: 'rtl' | 'ltr'
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        dir={dir as any}
        className="mt-1"
      />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}
