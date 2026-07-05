/**
 * ProductsManager — full CRUD UI for products.
 * Search, filter, create, edit, delete with confirmation.
 */
'use client'

import { useState } from 'react'
import { useAdminProducts, useDeleteProduct, useAdminBrands, useAdminCategories } from '@/shared/hooks/admin-queries'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Search, Plus, Pencil, Trash2, Loader2, Package, Eye, Star, Tag } from 'lucide-react'
import { formatPrice } from '@/lib/format'
import { ProductForm } from './product-form'
import { toast } from 'sonner'

export function ProductsManager() {
  const [search, setSearch] = useState('')
  const [brandFilter, setBrandFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading } = useAdminProducts({
    search: search || undefined,
    brandId: brandFilter !== 'all' ? brandFilter : undefined,
    categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
  })
  const { data: brandsData } = useAdminBrands()
  const { data: categoriesData } = useAdminCategories()
  const deleteMutation = useDeleteProduct()

  const handleEdit = (id: string) => {
    setEditingId(id)
    setShowForm(true)
  }
  const handleCreate = () => {
    setEditingId(null)
    setShowForm(true)
  }
  const handleDelete = async () => {
    if (!deleteId) return
    await deleteMutation.mutateAsync(deleteId)
    setDeleteId(null)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو SKU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pr-9"
            />
          </div>
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-32 h-9"><SelectValue placeholder="ماركة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الماركات</SelectItem>
              {brandsData?.brands.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-32 h-9"><SelectValue placeholder="فئة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفئات</SelectItem>
              {categoriesData?.categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="inactive">موقوف</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleCreate} className="gap-2 shadow-glow">
          <Plus className="size-4" /> إضافة منتج
        </Button>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox icon={Package} label="إجمالي" value={data?.products.length ?? 0} />
        <StatBox icon={Eye} label="نشط" value={data?.products.filter(p => p.isActive).length ?? 0} color="text-success" />
        <StatBox icon={Star} label="مميز" value={data?.products.filter(p => p.isFeatured).length ?? 0} color="text-warning" />
        <StatBox icon={Tag} label="عروض" value={data?.products.filter(p => p.isOnSale).length ?? 0} color="text-destructive" />
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="grid place-items-center py-12"><Loader2 className="size-6 animate-spin text-primary" /></div>
        ) : (data?.products?.length ?? 0) === 0 ? (
          <div className="text-center py-12">
            <Package className="size-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">لا توجد منتجات مطابقة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المنتج</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>الماركة</TableHead>
                  <TableHead>الفئة</TableHead>
                  <TableHead>السعر</TableHead>
                  <TableHead>المخزون</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.products.map((p: any) => {
                  const totalStock = p.variants.reduce((s: number, v: any) => s + Math.max(0, v.stock - (v.reservedStock ?? 0)), 0)
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="size-12 rounded-lg overflow-hidden bg-muted shrink-0">
                            {p.images?.[0]?.url && (
                              <img src={p.images[0].url} alt={p.name} className="size-full object-cover" loading="lazy" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium line-clamp-1 max-w-[200px]">{p.name}</div>
                            <div className="flex gap-1 mt-0.5">
                              {p.isFeatured && <Badge className="badge-best text-[10px] py-0 h-4">مميز</Badge>}
                              {p.isOnSale && <Badge className="badge-sale text-[10px] py-0 h-4">عرض</Badge>}
                              {p.isNewArrival && <Badge className="badge-new text-[10px] py-0 h-4">جديد</Badge>}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                      <TableCell>{p.brand?.name ?? '—'}</TableCell>
                      <TableCell>{p.category?.name ?? '—'}</TableCell>
                      <TableCell className="font-bold text-primary">{formatPrice(p.price)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={totalStock > 10 ? 'text-success border-success/30' : totalStock > 0 ? 'text-warning border-warning/30' : 'text-destructive border-destructive/30'}>
                          {totalStock}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.isActive ? 'default' : 'secondary'}>
                          {p.isActive ? 'نشط' : 'موقوف'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="size-8" onClick={() => handleEdit(p.id)} aria-label="تعديل">
                            <Pencil className="size-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="size-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(p.id)} aria-label="حذف">
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Form dialog */}
      <ProductForm open={showForm} onOpenChange={setShowForm} productId={editingId} />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف المنتج</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا المنتج؟ سيتم تعليقه (soft delete) ويمكن استرجاعه لاحقاً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function StatBox({ icon: Icon, label, value, color }: any) {
  return (
    <Card className="p-3 flex items-center gap-3">
      <div className={`size-9 rounded-xl bg-accent grid place-items-center ${color ?? 'text-primary'}`}>
        <Icon className="size-5" />
      </div>
      <div>
        <div className="font-display text-xl font-bold">{value}</div>
        <div className="text-[10px] text-muted-foreground">{label}</div>
      </div>
    </Card>
  )
}
