import { OrderSummary } from '@/types'

const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY || ''
const PAYMOB_INTEGRATION_ID = Number(process.env.PAYMOB_INTEGRATION_ID || 0)
const PAYMOB_BASE = 'https://accept.paymob.com/api'

async function fetchPaymob(path: string, body: any) {
  const res = await fetch(`${PAYMOB_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Paymob error ${res.status}`)
  }
  return data
}

export const paymobService = {
  async createPaymentUrl(order: OrderSummary, billingData: Record<string, any>) {
    if (!PAYMOB_API_KEY || !PAYMOB_INTEGRATION_ID) {
      throw new Error('Paymob environment variables are not configured.')
    }

    const auth = await fetchPaymob('/auth/tokens', { api_key: PAYMOB_API_KEY })
    const authToken = auth.token
    if (!authToken) {
      throw new Error('Failed to authenticate with Paymob.')
    }

    const paymobOrder = await fetchPaymob('/ecommerce/orders', {
      auth_token: authToken,
      delivery_needed: false,
      amount_cents: Math.round(order.total * 100),
      currency: order.currency,
      merchant_order_id: order.orderNumber,
      items: order.items.map((item) => ({
        name: item.name,
        amount_cents: Math.round(item.total * 100),
        description: item.variantName ?? item.name,
        quantity: item.quantity,
      })),
    })

    const paymentKeyResponse = await fetchPaymob('/acceptance/payment_keys', {
      auth_token: authToken,
      amount_cents: Math.round(order.total * 100),
      expiration: 3600,
      order_id: paymobOrder.id,
      billing_data: {
        apartment: billingData.address2 ?? '',
        email: billingData.email,
        floor: billingData.state ?? '',
        first_name: billingData.firstName,
        last_name: billingData.lastName,
        street: billingData.address1,
        building: billingData.address2 ?? '',
        phone_number: billingData.phone,
        shipping_method: 'NA',
        postal_code: billingData.postalCode ?? '',
        city: billingData.city,
        country: billingData.country,
      },
      currency: order.currency,
      integration_id: PAYMOB_INTEGRATION_ID,
      lock_order_when_paid: true,
      return_url: process.env.PAYMOB_RETURN_URL || `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000'}/paymob-result?orderNumber=${encodeURIComponent(order.orderNumber)}`,
    })

    if (!paymentKeyResponse.token) {
      throw new Error('Payment token not returned by Paymob.')
    }

    return `https://accept.paymob.com/api/acceptance/iframes/${PAYMOB_INTEGRATION_ID}?payment_token=${paymentKeyResponse.token}`
  },
}
