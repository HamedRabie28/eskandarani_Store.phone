/**
 * CouponsManager — CRUD UI for coupons.
 */
'use client'

import { useState } from 'react'
import { useAdminCoupons, useCreateCoupon, useUpdateCoupon, useDeleteCoupon } from '@/shared/hooks/admin-queries'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Loader2, Ticket, Save, X, Percent, DollarSign, Truck } from 'lucide-react'
import { formatPrice, formatDate } from '@/lib/format'

const COUPON_TYPES = [
  { value: 'PERCENTAGE', label: 'نسبة مئوية %', icon: Percent },
  { value: 'FIXED', label: 'مبلغ ثابت', icon: DollarSign },
  { value: 'FREE_SHIPPING', label: 'شحن مجاني', icon: Truck },
]

type CouponType = 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING'

export function CouponsManager() {
  const { data, isLoading } = useAdminCoupons()
  const createMutation = useCreateCoupon()
  const updateMutation = useUpdateCoupon()
  const deleteMutation = useDeleteCoupon()

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<{
    code: string
    description: string
    type: CouponType
    value: number
    minSubtotal: number
    maxDiscount: number
    usageLimit: number
    perUserLimit: number
    startsAt: string
    endsAt: string
    isActive: boolean
  }>({
    code: '', description: '', type: 'PERCENTAGE', value: 0,
    minSubtotal: 0, maxDiscount: 0, usageLimit: 100, perUserLimit: 1,
    startsAt: new Date().toISOString().slice(0, 10),
    endsAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    isActive: true,
  })

  const handleCreate = () => {
    setEditing(null)
    setForm({
      code: '', description: '', type: 'PERCENTAGE', value: 10,
      minSubtotal: 0, maxDiscount: 0, usageLimit: 100, perUserLimit: 1,
      startsAt: new Date().toISOString().slice(0, 10),
      endsAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      isActive: true,
    })
    setShowForm(true)
  }
  const handleEdit = (c: any) => {
    setEditing(c)
    setForm({
      code: c.code, description: c.description ?? '', type: c.type, value: c.value,
      minSubtotal: c.minSubtotal ?? 0, maxDiscount: c.maxDiscount ?? 0,
      usageLimit: c.usageLimit ?? 100, perUserLimit: c.perUserLimit ?? 1,
      startsAt: c.startsAt ? new Date(c.startsAt).toISOString().slice(0, 10) : '',
      endsAt: c.endsAt ? new Date(c.endsAt).toISOString().slice(0, 10) : '',
      isActive: c.isActive,
    })
    setShowForm(true)
  }
  const handleSave = async () => {
    if (!form.code) return
    const payload: any = {
      ...form,
      minSubtotal: form.minSubtotal > 0 ? form.minSubtotal : undefined,
      maxDiscount: form.maxDiscount > 0 ? form.maxDiscount : undefined,
      usageLimit: form.usageLimit > 0 ? form.usageLimit : undefined,
      perUserLimit: form.perUserLimit > 0 ? form.perUserLimit : undefined,
      endsAt: form.endsAt || null,
    }
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, ...payload })
    } else {
      await createMutation.mutateAsync(payload)
    }
    setShowForm(false)
  }
  const handleDelete = async () => {
    if (!deleteId) return
    await deleteMutation.mutateAsync(deleteId)
    setDeleteId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Ticket className="size-5 text-primary" /> الكوبونات ({data?.coupons.length ?? 0})
        </h3>
        <Button onClick={handleCreate} className="gap-2 shadow-glow">
          <Plus className="size-4" /> إضافة كوبون
        </Button>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-12"><Loader2 className="size-6 animate-spin text-primary" /></div>
      ) : (data?.coupons.length ?? 0) === 0 ? (
        <Card className="p-12 text-center">
          <Ticket className="size-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">لا توجد كوبونات بعد</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data?.coupons.map((c: any) => {
            const typeInfo = COUPON_TYPES.find(t => t.value === c.type)!
            const usagePercent = c.usageLimit ? (c.usedCount / c.usageLimit) * 100 : 0
            return (
              <Card key={c.id} className="p-4 group hover:shadow-soft transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="font-mono font-bold text-lg gradient-text">{c.code}</div>
                  <Badge variant={c.isActive ? 'default' : 'secondary'}>
                    {c.isActive ? 'نشط' : 'موقوف'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <typeInfo.icon className="size-4 text-primary" />
                  <span className="text-sm font-semibold">
                    {c.type === 'PERCENTAGE' ? `${c.value}%` :
                     c.type === 'FIXED' ? formatPrice(c.value) :
                     'شحن مجاني'}
                  </span>
                </div>
                {c.description && <p className="text-xs text-muted-foreground mb-2">{c.description}</p>}
                <div className="text-xs space-y-1 text-muted-foreground">
                  <div>الحد الأدنى: {c.minSubtotal ? formatPrice(c.minSubtotal) : 'لا يوجد'}</div>
                  <div>الاستخدام: {c.usedCount}/{c.usageLimit ?? '∞'}</div>
                  {c.endsAt && <div>ينتهي: {formatDate(c.endsAt)}</div>}
                </div>
                {c.usageLimit && (
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-primary" style={{ width: `${Math.min(100, usagePercent)}%` }} />
                  </div>
                )}
                <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => handleEdit(c)}>
                    <Pencil className="size-3.5" /> تعديل
                  </Button>
                  <Button size="icon" variant="ghost" className="size-8 text-destructive" onClick={() => setDeleteId(c.id)} aria-label="حذف">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'تعديل كوبون' : 'إضافة كوبون'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">الكود *</Label>
                <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} dir="ltr" className="mt-1 font-mono" placeholder="WELCOME10" />
              </div>
              <div>
                <Label className="text-xs">النوع</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COUPON_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">القيمة {form.type === 'PERCENTAGE' ? '(%)' : '(ج.م)'}</Label>
                <Input type="number" value={form.value} onChange={e => setForm({ ...form, value: Number(e.target.value) })} className="mt-1" disabled={form.type === 'FREE_SHIPPING'} />
              </div>
              <div>
                <Label className="text-xs">الحد الأدنى للطلب</Label>
                <Input type="number" value={form.minSubtotal} onChange={e => setForm({ ...form, minSubtotal: Number(e.target.value) })} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">الوصف</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">حد الاستخدام الإجمالي</Label>
                <Input type="number" value={form.usageLimit} onChange={e => setForm({ ...form, usageLimit: Number(e.target.value) })} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">حد الاستخدام لكل مستخدم</Label>
                <Input type="number" value={form.perUserLimit} onChange={e => setForm({ ...form, perUserLimit: Number(e.target.value) })} className="mt-1" />
              </div>
            </div>
            {form.type === 'PERCENTAGE' && (
              <div>
                <Label className="text-xs">أقصى خصم (ج.م)</Label>
                <Input type="number" value={form.maxDiscount} onChange={e => setForm({ ...form, maxDiscount: Number(e.target.value) })} className="mt-1" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">يبدأ في</Label>
                <Input type="date" value={form.startsAt} onChange={e => setForm({ ...form, startsAt: e.target.value })} className="mt-1" dir="ltr" />
              </div>
              <div>
                <Label className="text-xs">ينتهي في</Label>
                <Input type="date" value={form.endsAt} onChange={e => setForm({ ...form, endsAt: e.target.value })} className="mt-1" dir="ltr" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.isActive} onCheckedChange={(c) => setForm({ ...form, isActive: !!c })} />
              نشط
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)} className="gap-1"><X className="size-4" /> إلغاء</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="gap-1">
              {createMutation.isPending || updateMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الكوبون</AlertDialogTitle>
            <AlertDialogDescription>لا يمكن التراجع عن هذا الإجراء. متابعة؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
