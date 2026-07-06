/**
 * CheckoutPage — multi-step checkout with persistent state via URL hash.
 * Steps: address → shipping → coupon → payment → review → confirmation
 * All steps save automatically (persisted in component state + cart store).
 */
'use client'

import { useUIStore } from '@/shared/stores/ui.store'
import { useCartStore } from '@/shared/stores/cart.store'
import { useCart, useShippingOptions, usePlaceOrder } from '@/shared/hooks/queries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Check, ChevronLeft, ChevronRight, MapPin, Truck, Tag, CreditCard, ListChecks, Loader2, ShoppingBag, Lock, Wallet, Banknote } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { formatPrice } from '@/lib/format'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { z } from 'zod'
import { cn } from '@/lib/utils'

type Step = 'address' | 'shipping' | 'coupon' | 'payment' | 'review' | 'confirmation'
const STEPS: { id: Step; label: string; icon: any }[] = [
  { id: 'address', label: 'العنوان', icon: MapPin },
  { id: 'shipping', label: 'الشحن', icon: Truck },
  { id: 'coupon', label: 'الخصم', icon: Tag },
  { id: 'payment', label: 'الدفع', icon: CreditCard },
  { id: 'review', label: 'المراجعة', icon: ListChecks },
]

const addressSchema = z.object({
  firstName: z.string().min(2, 'الاسم الأول مطلوب'),
  lastName: z.string().min(2, 'الاسم الأخير مطلوب'),
  email: z.string().email('بريد إلكتروني غير صحيح'),
  phone: z.string().min(8, 'رقم هاتف غير صحيح'),
  address1: z.string().min(5, 'العنوان مطلوب'),
  address2: z.string().optional(),
  city: z.string().min(2, 'المدينة مطلوبة'),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('Egypt'),
})

export function CheckoutPage() {
  const { setView, orderNumber, setProductFilters, resetFilters } = useUIStore()
  const { lines, summary, couponCode, couponDiscount, couponFreeShipping } = useCartStore()
  const { isLoading: cartLoading } = useCart()
  const placeOrder = usePlaceOrder()

  const [step, setStep] = useState<Step>('address')
  const [address, setAddress] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address1: '', address2: '', city: '', state: '', postalCode: '', country: 'Egypt',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [userShippingMethod, setUserShippingMethod] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [customerNotes, setCustomerNotes] = useState('')
  const [confirmedOrder, setConfirmedOrder] = useState<any>(null)
  const [saveInfo, setSaveInfo] = useState(true)
  const [hydrated, setHydrated] = useState(false)

  // Restore saved address on mount (client-only)
  useEffect(function restoreAddressFromStorage() {
    try {
      const saved = localStorage.getItem('ask-checkout-address')
      if (saved) {
        const parsed = JSON.parse(saved)
        setAddress(prev => ({ ...prev, ...parsed }))
      }
    } catch {}
    setHydrated(true)
  }, [])

  const subtotal = summary?.subtotal ?? 0
  const { data: shippingData, isLoading: shippingLoading } = useShippingOptions(lines, subtotal, lines.length > 0 && step !== 'address')

  // Derive effective shipping method: explicit user choice OR first recommended option
  const effectiveShipping = useMemo(() => {
    if (!shippingData?.options?.length) return null
    const explicit = shippingData.options.find(o => o.code === userShippingMethod)
    if (explicit) return explicit
    return shippingData.options.find(o => o.isRecommended) ?? shippingData.options[0]
  }, [shippingData, userShippingMethod])
  const shippingMethod = effectiveShipping?.code ?? ''
  const shippingCost = effectiveShipping?.cost ?? 0
  const setShippingMethod = (code: string) => setUserShippingMethod(code)

  // Save address on change (client-only after hydration)
  useEffect(() => {
    if (!hydrated || !saveInfo) return
    try {
      localStorage.setItem('ask-checkout-address', JSON.stringify(address))
    } catch {}
  }, [address, saveInfo, hydrated])

  // Persist step in URL hash for resume-after-refresh
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${step}`)
    }
  }, [step])

  if (cartLoading && lines.length === 0) {
    return (
      <div className="container-x section-y grid place-items-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (lines.length === 0 && step !== 'confirmation') {
    return (
      <div className="container-x section-y text-center">
        <ShoppingBag className="size-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">سلتك فارغة</h2>
        <p className="text-sm text-muted-foreground mb-4">أضف منتجات قبل إتمام الطلب</p>
        <Button onClick={() => { resetFilters(); setView('products') }}>تسوّق الآن</Button>
      </div>
    )
  }

  const validateAddress = () => {
    const parsed = addressSchema.safeParse(address)
    if (!parsed.success) {
      const errs: Record<string, string> = {}
      parsed.error.issues.forEach(i => { errs[i.path[0] as string] = i.message })
      setErrors(errs)
      return false
    }
    setErrors({})
    return true
  }

  const goNext = () => {
    const order: Step[] = ['address', 'shipping', 'coupon', 'payment', 'review']
    const idx = order.indexOf(step)
    if (step === 'address' && !validateAddress()) return
    if (idx < order.length - 1) setStep(order[idx + 1])
  }
  const goPrev = () => {
    const order: Step[] = ['address', 'shipping', 'coupon', 'payment', 'review']
    const idx = order.indexOf(step)
    if (idx > 0) setStep(order[idx - 1])
  }

  const handlePlaceOrder = async () => {
    if (!validateAddress()) {
      setStep('address')
      toast.error('يرجى مراجعة بيانات العنوان')
      return
    }
    placeOrder.mutate({
      address,
      shippingMethod,
      shippingCost: couponFreeShipping ? 0 : shippingCost,
      couponCode: couponCode ?? undefined,
      couponDiscount: couponDiscount || undefined,
      couponFreeShipping: couponFreeShipping || undefined,
      paymentMethod,
      customerNotes,
    }, {
      onSuccess: (data) => {
        if (data.paymentUrl) {
          window.location.href = data.paymentUrl
          return
        }
        setConfirmedOrder(data.order)
        setStep('confirmation')
        toast.success('تم إنشاء الطلب بنجاح!')
      },
      onError: (err: any) => toast.error(err.message),
    })
  }

  const currentStepIdx = STEPS.findIndex(s => s.id === step)
  const totalAfterDiscount = Math.max(0, subtotal - couponDiscount)
  const totalShipping = couponFreeShipping ? 0 : shippingCost
  const grandTotal = totalAfterDiscount + totalShipping

  return (
    <div className="container-x section-y-sm">
      <div className="mb-6">
        <button onClick={() => setView('home')} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-2">
          <ChevronRight className="size-4" /> العودة للتسوق
        </button>
        <h1 className="font-display text-2xl lg:text-3xl font-extrabold">إتمام الطلب</h1>
      </div>

      {/* Stepper */}
      {step !== 'confirmation' && (
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {STEPS.map((s, i) => {
              const isActive = s.id === step
              const isDone = currentStepIdx > i
              return (
                <div key={s.id} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={cn(
                      "size-10 rounded-full grid place-items-center transition-all",
                      isActive ? "bg-primary text-primary-foreground shadow-glow scale-110" :
                      isDone ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {isDone ? <Check className="size-5" /> : <s.icon className="size-5" />}
                    </div>
                    <div className={cn("text-xs font-medium hidden sm:block", isActive && "text-primary")}>
                      {s.label}
                    </div>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={cn("flex-1 h-0.5 mx-2 transition-colors", isDone ? "bg-success" : "bg-border")} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_360px] gap-6 lg:gap-8">
        {/* Main step content */}
        <div>
          <AnimatePresence mode="wait">
            {step === 'address' && (
              <motion.div key="address" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Card className="p-5 lg:p-6">
                  <h2 className="font-bold text-lg mb-4">بيانات التوصيل</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="الاسم الأول" name="firstName" value={address.firstName} onChange={v => setAddress({...address, firstName: v})} error={errors.firstName} />
                    <Field label="الاسم الأخير" name="lastName" value={address.lastName} onChange={v => setAddress({...address, lastName: v})} error={errors.lastName} />
                    <Field label="البريد الإلكتروني" name="email" type="email" value={address.email} onChange={v => setAddress({...address, email: v})} error={errors.email} />
                    <Field label="رقم الهاتف" name="phone" type="tel" value={address.phone} onChange={v => setAddress({...address, phone: v})} error={errors.phone} />
                    <div className="sm:col-span-2">
                      <Field label="العنوان" name="address1" value={address.address1} onChange={v => setAddress({...address, address1: v})} error={errors.address1} />
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="العنوان (تفاصيل إضافية)" name="address2" value={address.address2 ?? ''} onChange={v => setAddress({...address, address2: v})} required={false} />
                    </div>
                    <Field label="المدينة" name="city" value={address.city} onChange={v => setAddress({...address, city: v})} error={errors.city} />
                    <Field label="المحافظة" name="state" value={address.state ?? ''} onChange={v => setAddress({...address, state: v})} required={false} />
                    <Field label="الكود البريدي" name="postalCode" value={address.postalCode ?? ''} onChange={v => setAddress({...address, postalCode: v})} required={false} />
                    <Field label="الدولة" name="country" value={address.country} onChange={v => setAddress({...address, country: v})} required={false} />
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <Checkbox id="save" checked={saveInfo} onCheckedChange={(c) => setSaveInfo(!!c)} />
                    <Label htmlFor="save" className="text-sm text-muted-foreground cursor-pointer">
                      احفظ بياناتي لطلباتي القادمة
                    </Label>
                  </div>
                </Card>
              </motion.div>
            )}

            {step === 'shipping' && (
              <motion.div key="shipping" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Card className="p-5 lg:p-6">
                  <h2 className="font-bold text-lg mb-4">اختر طريقة الشحن</h2>
                  {shippingLoading ? (
                    <div className="grid place-items-center py-8">
                      <Loader2 className="size-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <RadioGroup value={shippingMethod} onValueChange={(v) => {
                      setShippingMethod(v)
                      const opt = shippingData?.options.find(o => o.code === v)
                    }}>
                      <div className="space-y-2">
                        {shippingData?.options.map(opt => (
                          <label
                            key={opt.code}
                            className={cn(
                              "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                              shippingMethod === opt.code ? "border-primary bg-accent shadow-soft" : "border-border hover:border-primary/50"
                            )}
                          >
                            <RadioGroupItem value={opt.code} id={opt.code} />
                            <div className="flex-1">
                              <div className="font-semibold flex items-center gap-2">
                                {opt.name}
                                {opt.isRecommended && <span className="text-[10px] bg-success text-success-foreground px-1.5 py-0.5 rounded">موصى به</span>}
                                {opt.isFree && <span className="text-[10px] bg-success text-success-foreground px-1.5 py-0.5 rounded">مجاني</span>}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {opt.estimatedDays === 0 ? 'استلام فوري' : `توصيل خلال ${opt.estimatedDays} ${opt.estimatedDays === 1 ? 'يوم' : 'أيام'}`}
                                {opt.description && ` · ${opt.description}`}
                              </div>
                            </div>
                            <div className="font-bold text-primary">
                              {opt.cost === 0 ? 'مجاني' : formatPrice(opt.cost)}
                            </div>
                          </label>
                        ))}
                      </div>
                    </RadioGroup>
                  )}
                </Card>
              </motion.div>
            )}

            {step === 'coupon' && (
              <motion.div key="coupon" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Card className="p-5 lg:p-6">
                  <h2 className="font-bold text-lg mb-4">كود الخصم</h2>
                  {couponCode ? (
                    <div className="p-4 rounded-xl bg-success/10 border border-success/30 flex items-center justify-between">
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          <Tag className="size-4 text-success" /> {couponCode}
                        </div>
                        <div className="text-sm text-success mt-0.5">
                          {couponFreeShipping ? 'شحن مجاني' : `خصم ${formatPrice(couponDiscount)}`}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => useCartStore.getState().setCoupon(null, 0, false, null)}>
                        إزالة
                      </Button>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      لا يوجد كود خصم مُطبَّق. يمكنك إضافة كوبون من سلة التسوق أو العودة لاحقاً.
                    </div>
                  )}
                  <div className="mt-4 p-4 rounded-xl bg-accent/30">
                    <div className="text-xs font-semibold mb-2">أكواد مقترحة:</div>
                    <div className="flex flex-wrap gap-2">
                      {['WELCOME10', 'SAVE500', 'FREESHIP', 'VIP15'].map(c => (
                        <span key={c} className="text-xs px-2 py-1 rounded-md bg-card border border-border font-mono">{c}</span>
                      ))}
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {step === 'payment' && (
              <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Card className="p-5 lg:p-6">
                  <h2 className="font-bold text-lg mb-4">طريقة الدفع</h2>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                    <div className="space-y-2">
                      {[
                        { id: 'cod', label: 'الدفع عند الاستلام', icon: Banknote, desc: 'ادفع نقداً عند استلام طلبك' },
                        { id: 'card', label: 'بطاقة ائتمانية', icon: CreditCard, desc: 'Visa, Mastercard, Meeza' },
                        { id: 'wallet', label: 'محفظة إلكترونية', icon: Wallet, desc: 'فودافون كاش, إنستاباي' },
                      ].map(m => (
                        <label
                          key={m.id}
                          className={cn(
                            "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                            paymentMethod === m.id ? "border-primary bg-accent shadow-soft" : "border-border hover:border-primary/50"
                          )}
                        >
                          <RadioGroupItem value={m.id} id={m.id} />
                          <m.icon className="size-5 text-primary" />
                          <div className="flex-1">
                            <div className="font-semibold">{m.label}</div>
                            <div className="text-xs text-muted-foreground">{m.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </RadioGroup>
                  <div className="mt-4">
                    <Label htmlFor="notes">ملاحظات الطلب (اختياري)</Label>
                    <textarea
                      id="notes"
                      value={customerNotes}
                      onChange={e => setCustomerNotes(e.target.value)}
                      placeholder="أي تعليمات خاصة بالطلب..."
                      className="w-full mt-1 p-3 rounded-xl border border-input bg-background text-sm resize-none"
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                    <Lock className="size-3" />
                    معاملاتك مشفرة وآمنة 100%
                  </div>
                </Card>
              </motion.div>
            )}

            {step === 'review' && (
              <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Card className="p-5 lg:p-6">
                  <h2 className="font-bold text-lg mb-4">مراجعة الطلب</h2>

                  {/* Address summary */}
                  <div className="p-3 rounded-xl bg-accent/30 mb-3">
                    <div className="text-xs font-semibold text-muted-foreground mb-1">عنوان التوصيل</div>
                    <div className="text-sm">{address.firstName} {address.lastName}</div>
                    <div className="text-xs text-muted-foreground">{address.address1}, {address.city}, {address.country}</div>
                    <div className="text-xs text-muted-foreground" dir="ltr">{address.phone}</div>
                  </div>

                  {/* Shipping */}
                  <div className="p-3 rounded-xl bg-accent/30 mb-3">
                    <div className="text-xs font-semibold text-muted-foreground mb-1">طريقة الشحن</div>
                    <div className="text-sm">{shippingData?.options.find(o => o.code === shippingMethod)?.name}</div>
                  </div>

                  {/* Payment */}
                  <div className="p-3 rounded-xl bg-accent/30 mb-3">
                    <div className="text-xs font-semibold text-muted-foreground mb-1">طريقة الدفع</div>
                    <div className="text-sm">
                      {paymentMethod === 'cod' ? 'الدفع عند الاستلام' : paymentMethod === 'card' ? 'بطاقة ائتمانية' : 'محفظة إلكترونية'}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="text-xs font-semibold text-muted-foreground mb-2">المنتجات ({lines.length})</div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {lines.map(line => (
                      <div key={line.id} className="flex items-center gap-3 p-2 rounded-lg">
                        <div className="size-12 rounded-lg overflow-hidden bg-muted shrink-0">
                          {line.imageUrl && <img src={line.imageUrl} alt={line.name} className="size-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium line-clamp-1">{line.name}</div>
                          <div className="text-xs text-muted-foreground">{line.quantity}× {formatPrice(line.price)}</div>
                        </div>
                        <div className="text-sm font-bold">{formatPrice(line.price * line.quantity)}</div>
                      </div>
                    ))}
                  </div>

                  {customerNotes && (
                    <div className="mt-3 p-3 rounded-xl bg-accent/30">
                      <div className="text-xs font-semibold text-muted-foreground mb-1">ملاحظات</div>
                      <div className="text-sm">{customerNotes}</div>
                    </div>
                  )}
                </Card>
              </motion.div>
            )}

            {step === 'confirmation' && confirmedOrder && (
              <motion.div key="confirmation" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <Card className="p-8 lg:p-10 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.2 }}
                    className="size-20 mx-auto rounded-full bg-success/10 grid place-items-center mb-4"
                  >
                    <Check className="size-10 text-success" />
                  </motion.div>
                  <h2 className="font-display text-2xl lg:text-3xl font-extrabold mb-2">تم استلام طلبك بنجاح!</h2>
                  <p className="text-muted-foreground mb-4">شكراً لك. ستصلك رسالة تأكيد على بريدك الإلكتروني.</p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent mb-6">
                    <span className="text-sm text-muted-foreground">رقم الطلب:</span>
                    <span className="font-bold font-mono">{confirmedOrder.orderNumber}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={() => useUIStore.getState().setView('order-tracking', { orderNumber: confirmedOrder.orderNumber })} className="gap-2">
                      تتبع الطلب <ChevronLeft className="size-4" />
                    </Button>
                    <Button variant="outline" onClick={() => { resetFilters(); setView('products') }}>
                      مواصلة التسوق
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          {step !== 'confirmation' && (
            <div className="flex justify-between mt-6">
              <Button variant="ghost" onClick={goPrev} disabled={step === 'address'} className="gap-1">
                <ChevronRight className="size-4" /> السابق
              </Button>
              {step === 'review' ? (
                <Button onClick={handlePlaceOrder} disabled={placeOrder.isPending} className="gap-2 shadow-glow">
                  {placeOrder.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  تأكيد الطلب ({formatPrice(grandTotal)})
                </Button>
              ) : (
                <Button onClick={goNext} className="gap-1">
                  التالي <ChevronLeft className="size-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Order summary sidebar */}
        {step !== 'confirmation' && (
          <div className="lg:sticky lg:top-32 lg:self-start">
            <Card className="p-5">
              <h3 className="font-bold mb-4">ملخص الطلب</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                {lines.map(line => (
                  <div key={line.id} className="flex items-center gap-2 text-sm">
                    <div className="size-10 rounded-lg overflow-hidden bg-muted shrink-0">
                      {line.imageUrl && <img src={line.imageUrl} alt={line.name} className="size-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="line-clamp-1 font-medium">{line.name}</div>
                      <div className="text-xs text-muted-foreground">×{line.quantity}</div>
                    </div>
                    <div className="font-semibold">{formatPrice(line.price * line.quantity)}</div>
                  </div>
                ))}
              </div>
              <Separator className="my-3" />
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المجموع الفرعي</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>الخصم ({couponCode})</span>
                    <span>- {formatPrice(couponDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الشحن</span>
                  <span className="font-medium">
                    {step === 'address' ? 'يُحسب لاحقاً' :
                     couponFreeShipping ? 'مجاني' :
                     shippingCost === 0 ? 'يُحسب لاحقاً' : formatPrice(shippingCost)}
                  </span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-base">
                  <span>الإجمالي</span>
                  <span className="text-primary">{formatPrice(grandTotal)}</span>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-xl bg-accent/30 text-xs text-muted-foreground flex items-start gap-2">
                <Lock className="size-4 shrink-0 mt-0.5 text-primary" />
                <span>معاملاتك آمنة ومشفرة. لن نشارك بياناتك مع أي طرف ثالث.</span>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({
  label, name, value, onChange, error, type = 'text', required = true,
}: {
  label: string
  name: string
  value: string
  onChange: (v: string) => void
  error?: string
  type?: string
  required?: boolean
}) {
  return (
    <div>
      <Label htmlFor={name} className="text-sm">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <input
        id={name}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cn(
          "mt-1 flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          error && "border-destructive"
        )}
      />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}
