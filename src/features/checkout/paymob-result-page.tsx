'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CheckCircle2, XCircle, ArrowLeft } from 'lucide-react'
import { useOrder } from '@/shared/hooks/queries'
import { useUIStore } from '@/shared/stores/ui.store'
import { formatDateTime } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export function PaymobResultPage() {
  const params = useSearchParams()
  const orderNumber = params.get('orderNumber')
  const email = params.get('email') ?? undefined
  const { setView } = useUIStore()
  const [submitted, setSubmitted] = useState(false)
  const { data, isLoading, error } = useOrder(orderNumber, email)

  useEffect(() => {
    if (orderNumber) setSubmitted(true)
  }, [orderNumber])

  const handleBack = () => setView('home')

  const order = data?.order
  const paymentSuccess = order?.paymentStatus === 'PAID'

  return (
    <div className="container-x section-y-sm">
      <div className="max-w-3xl mx-auto">
        <Card className="p-8 text-center">
          {submitted && isLoading ? (
            <div className="space-y-4">
              <div className="text-2xl font-bold">جارٍ التحقق من حالة الدفع...</div>
              <p className="text-sm text-muted-foreground">قد تحتاج لحظة لاستلام إشعار الدفع من بوابة الدفع.</p>
            </div>
          ) : error || !order ? (
            <div className="space-y-4">
              <XCircle className="size-16 mx-auto text-destructive" />
              <div className="text-2xl font-bold">تعذر العثور على الطلب</div>
              <p className="text-sm text-muted-foreground">تأكد من إكمال عملية الدفع وأن رقم الطلب صحيح.</p>
            </div>
          ) : paymentSuccess ? (
            <div className="space-y-4">
              <CheckCircle2 className="size-16 mx-auto text-success" />
              <div className="text-2xl font-bold">تم الدفع بنجاح!</div>
              <p className="text-sm text-muted-foreground">شكراً لك، سيتم تجهيز طلبك الآن.</p>
              <div className="text-sm text-muted-foreground">رقم الطلب: {order.orderNumber}</div>
              <div className="text-sm text-muted-foreground">تم الدفع: {order.total} {order.currency}</div>
              <Badge variant="outline" className="mt-3">{order.paymentStatus}</Badge>
            </div>
          ) : (
            <div className="space-y-4">
              <XCircle className="size-16 mx-auto text-warning" />
              <div className="text-2xl font-bold">الطلب في حالة انتظار الدفع</div>
              <p className="text-sm text-muted-foreground">يرجى الانتظار قليلاً ثم تحديث الصفحة أو العودة إلى تتبع الطلب.</p>
              <div className="text-sm text-muted-foreground">الحالة الحالية: {order?.paymentStatus}</div>
              <div className="text-sm text-muted-foreground">آخر تحديث: {order ? formatDateTime(order.createdAt) : ''}</div>
            </div>
          )}

          <Separator className="my-6" />

          <Button size="lg" onClick={handleBack} className="gap-2">
            <ArrowLeft className="size-4" /> العودة إلى المتجر
          </Button>
        </Card>
      </div>
    </div>
  )
}
