/**
 * Domain Types — shared across client & server
 */

export interface Money {
  amount: number
  currency: string
}

export interface ProductCardData {
  id: string
  name: string
  slug: string
  price: number
  comparePrice: number | null
  currency: string
  imageUrl: string | null
  brandName: string | null
  rating: number
  reviewCount: number
  isFeatured: boolean
  isBestSeller: boolean
  isNewArrival: boolean
  isOnSale: boolean
  inStock: boolean
  discountPercent: number | null
}

export interface ProductDetail extends ProductCardData {
  sku: string
  description: string
  longDescription: string | null
  weight: number | null
  dimensions: string | null
  warranty: string | null
  brandId: string | null
  categoryId: string | null
  soldCount: number
  viewCount: number
  images: { id: string; url: string; altText: string | null; sortOrder: number }[]
  variants: {
    id: string
    name: string
    sku: string
    price: number | null
    stock: number
    reservedStock: number
    attributes: Record<string, string> | null
  }[]
  reviews: {
    id: string
    authorName: string
    rating: number
    title: string | null
    comment: string | null
    createdAt: string
    isVerified: boolean
  }[]
  related: ProductCardData[]
  specs: { label: string; value: string }[]
}

export interface CartLine {
  id: string
  productId: string
  variantId: string | null
  name: string
  slug: string
  imageUrl: string | null
  sku: string
  variantName: string | null
  price: number
  quantity: number
  stock: number
  maxQuantity: number
}

export interface CartSummary {
  subtotal: number
  discount: number
  shippingCost: number
  tax: number
  total: number
  currency: string
  itemCount: number
  totalSavings: number
}

export interface CouponResult {
  valid: boolean
  code: string
  discount: number
  freeShipping: boolean
  message: string
}

export interface CheckoutSession {
  token: string
  step: 'address' | 'shipping' | 'coupon' | 'payment' | 'review' | 'confirmation'
  address?: CheckoutAddress
  shippingMethod?: string
  shippingCost?: number
  couponCode?: string
  couponDiscount?: number
  couponFreeShipping?: boolean
  paymentMethod?: string
  summary: CartSummary
  createdAt: string
  updatedAt: string
}

export interface CheckoutAddress {
  firstName: string
  lastName: string
  email: string
  phone: string
  address1: string
  address2?: string
  city: string
  state?: string
  postalCode?: string
  country: string
}

export interface OrderSummary {
  id: string
  orderNumber: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  fulfillmentStatus: FulfillmentStatus
  subtotal: number
  discount: number
  shippingCost: number
  tax: number
  total: number
  currency: string
  couponCode: string | null
  shippingMethod: string | null
  trackingNumber: string | null
  createdAt: string
  items: {
    id: string
    name: string
    sku: string
    variantName: string | null
    price: number
    quantity: number
    total: number
    imageUrl: string | null
    slug: string | null
  }[]
  address: {
    firstName: string
    lastName: string
    email: string
    phone: string
    address1: string
    city: string
    country: string
  } | null
  timeline: {
    id: string
    status: OrderStatus
    note: string | null
    createdAt: string
  }[]
}

export type OrderStatus =
  | 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED'
  | 'DELIVERED' | 'CANCELLED' | 'REFUNDED' | 'ON_HOLD'

export type PaymentStatus =
  | 'PENDING' | 'PAID' | 'PARTIALLY_PAID' | 'REFUNDED'
  | 'PARTIALLY_REFUNDED' | 'FAILED'

export type FulfillmentStatus =
  | 'UNFULFILLED' | 'PARTIALLY_FULFILLED' | 'FULFILLED' | 'RESTOCKED'

export interface CategoryTreeNode {
  id: string
  name: string
  slug: string
  icon: string | null
  imageUrl: string | null
  productCount: number
  children: CategoryTreeNode[]
}

export interface BrandData {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  productCount: number
}

export interface AdminMetrics {
  revenue: number
  revenueChange: number
  orders: number
  ordersChange: number
  customers: number
  customersChange: number
  avgOrderValue: number
  conversionRate: number
  revenueSeries: { date: string; value: number }[]
  ordersByStatus: { status: string; count: number; color: string }[]
  topProducts: { id: string; name: string; sold: number; revenue: number }[]
  recentOrders: { id: string; orderNumber: string; customer: string; total: number; status: OrderStatus; createdAt: string }[]
}
