import { Resend } from 'resend'
import { db } from '@/lib/db'

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key')

export const emailService = {
  async sendOrderConfirmation(orderId: string): Promise<void> {
    if (!process.env.RESEND_API_KEY) {
      console.log(`Skipping order confirmation email for ${orderId} (No RESEND_API_KEY)`)
      return
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        address: true,
        items: true,
      }
    })

    if (!order) return

    const customerEmail = order.address?.email ?? order.guestEmail
    if (!customerEmail) return

    try {
      await resend.emails.send({
        from: 'Askandarani Phone <orders@askandarani.com>',
        to: customerEmail,
        subject: `تأكيد طلبك رقم ${order.orderNumber}`,
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h1 style="color: #2563eb;">شكراً لتسوقك معنا!</h1>
            <p>مرحباً ${order.address?.firstName ?? 'عميلنا العزيز'}،</p>
            <p>لقد استلمنا طلبك رقم <strong>${order.orderNumber}</strong> بنجاح ونعمل على تجهيزه الآن.</p>
            
            <h3>تفاصيل الطلب:</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background-color: #f3f4f6; text-align: right;">
                  <th style="padding: 10px; border: 1px solid #e5e7eb;">المنتج</th>
                  <th style="padding: 10px; border: 1px solid #e5e7eb;">الكمية</th>
                  <th style="padding: 10px; border: 1px solid #e5e7eb;">السعر</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map(item => `
                  <tr>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;">${item.name} ${item.variantName ? `(${item.variantName})` : ''}</td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;">${item.quantity}</td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;">${item.price} ج.م</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <p><strong>الإجمالي:</strong> ${order.total} ج.م</p>
            
            <p>سنتواصل معك قريباً لتأكيد موعد الشحن.</p>
            <p>فريق إسكندراني فون</p>
          </div>
        `
      })
    } catch (error) {
      console.error('Failed to send order confirmation email:', error)
    }
  },

  async sendOrderStatusUpdate(orderId: string, status: string, note?: string): Promise<void> {
    if (!process.env.RESEND_API_KEY) return

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { address: true }
    })

    if (!order) return

    const customerEmail = order.address?.email ?? order.guestEmail
    if (!customerEmail) return

    const statusTextMap: Record<string, string> = {
      CONFIRMED: 'تم تأكيد طلبك',
      SHIPPED: 'تم شحن طلبك',
      DELIVERED: 'تم توصيل طلبك بنجاح',
      CANCELLED: 'تم إلغاء طلبك',
    }

    const title = statusTextMap[status]
    if (!title) return // Only email on major status updates

    try {
      await resend.emails.send({
        from: 'Askandarani Phone <orders@askandarani.com>',
        to: customerEmail,
        subject: `تحديث حالة طلبك رقم ${order.orderNumber} - ${title}`,
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h1 style="color: #2563eb;">${title}</h1>
            <p>مرحباً ${order.address?.firstName ?? 'عميلنا العزيز'}،</p>
            <p>نود إعلامك بتحديث حالة طلبك رقم <strong>${order.orderNumber}</strong>.</p>
            ${note ? `<p style="padding: 15px; background-color: #f3f4f6; border-right: 4px solid #2563eb;">ملاحظة: ${note}</p>` : ''}
            
            <p>شكراً لثقتكم بنا.</p>
            <p>فريق إسكندراني فون</p>
          </div>
        `
      })
    } catch (error) {
      console.error('Failed to send order status email:', error)
    }
  }
}
