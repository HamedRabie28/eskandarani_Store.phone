import { NextRequest, NextResponse } from 'next/server'
import { orderService } from '@/server/services/order.service'
import { createHmac } from 'crypto'
import { db } from '@/lib/db'

// This should ideally be in env vars
const PAYMOB_HMAC_SECRET = process.env.PAYMOB_HMAC_SECRET || 'YOUR_PAYMOB_HMAC_SECRET'

/**
 * Validates the HMAC signature sent by Paymob
 */
function validateHmac(query: any, receivedHmac: string): boolean {
  // Paymob specific HMAC logic: concatenate specific fields from the payload
  const keys = [
    'amount_cents',
    'created_at',
    'currency',
    'error_occured',
    'has_parent_transaction',
    'id',
    'integration_id',
    'is_3d_secure',
    'is_auth',
    'is_capture',
    'is_refunded',
    'is_standalone_payment',
    'is_voided',
    'order',
    'owner',
    'pending',
    'source_data.pan',
    'source_data.sub_type',
    'source_data.type',
    'success',
  ]
  
  let stringToHash = ''
  for (const key of keys) {
    if (key.includes('.')) {
      const [parent, child] = key.split('.')
      stringToHash += query.obj?.[parent]?.[child] ?? ''
    } else if (key === 'order') {
      stringToHash += query.obj?.order?.id ?? ''
    } else {
      stringToHash += query.obj?.[key] === true ? 'true' : query.obj?.[key] === false ? 'false' : (query.obj?.[key] ?? '')
    }
  }

  const hmac = createHmac('sha512', PAYMOB_HMAC_SECRET)
  hmac.update(stringToHash)
  const calculatedHmac = hmac.digest('hex')

  return calculatedHmac === receivedHmac
}

export async function POST(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const receivedHmac = searchParams.get('hmac')
    const payload = await req.json()

    // Validate HMAC if we have a secret configured
    if (process.env.PAYMOB_HMAC_SECRET && receivedHmac) {
      if (!validateHmac(payload, receivedHmac)) {
        return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 })
      }
    }

    const { obj } = payload
    if (!obj || !obj.order) {
      return NextResponse.json({ error: 'Invalid Payload' }, { status: 400 })
    }

    // Paymob order ID is mapped to our transaction reference, or merchant_order_id is mapped to our orderNumber
    const merchantOrderId = obj.order.merchant_order_id
    if (!merchantOrderId) {
      return NextResponse.json({ error: 'Missing merchant_order_id' }, { status: 400 })
    }

    // Find the order
    const order = await db.order.findUnique({
      where: { orderNumber: merchantOrderId }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Update status based on payment success
    if (obj.success === true && obj.pending === false) {
      await orderService.updatePaymentStatus(
        order.id, 
        'PAID', 
        `تم الدفع بنجاح عبر Paymob (Transaction ID: ${obj.id})`
      )
    } else if (obj.success === false) {
      await orderService.updatePaymentStatus(
        order.id, 
        'FAILED', 
        `فشل الدفع عبر Paymob. السبب: ${obj.data?.message ?? 'مجهول'}`
      )
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Paymob Webhook Error:', e)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
