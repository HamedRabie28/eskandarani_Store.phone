/**
 * Askandarani Phone — Premium Seed Script
 * Uses locally generated product images (no mock URLs).
 * Creates: brands, categories, products, variants, coupons, shipping, reviews, settings.
 */
/// <reference types="node" />
import * as Prisma from '@prisma/client'
import { createHash } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import type * as cryptoType from 'crypto'
import type * as fsType from 'fs'
import type * as pathType from 'path'

// Ensure editor/type-checker recognizes the Node globals in this standalone script
declare const process: NodeJS.Process

const db = new Prisma.PrismaClient()

type SeedProduct = {
  n: string
  b: string
  c: string
  img: string
  p: number
  cp: number
  cp2?: number
  sale?: boolean
  featured?: boolean
  best?: boolean
  newArrival?: boolean
  storage?: string[]
  colors?: string[]
}

const pick = <T,>(arr: T[], i: number) => arr[i % arr.length]

function localImage(folder: string, name: string): string | null {
  const publicPath = path.join(process.cwd(), 'public', folder, `${name}.png`)
  if (fs.existsSync(publicPath)) return `/${folder}/${name}.png`
  return null
}

async function main() {
  console.log('🌱 Seeding Askandarani Phone (Premium Edition)...')

  // ---------- Admin user ----------
  const adminEmail = 'admin@askandarani.phone'
  const adminPassword = 'admin123'
  const adminPass = createHash('sha256').update(adminPassword).digest('hex')
  const admin = await db.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Store Admin',
      role: Prisma.UserRole.ADMIN,
      passwordHash: adminPass,
      phone: '+201000000000',
    },
  })
  console.log('  ✓ Admin user:', admin.email)

  // ---------- Brands ----------
  const brandData = [
    { name: 'Apple', slug: 'apple', country: 'USA', description: 'تقنيات آبل الرائدة — رفاهية وابتكار في كل تفصيل' },
    { name: 'Samsung', slug: 'samsung', country: 'Korea', description: 'سامسونج جالكسي — الأداء الفائق بأرقى التصاميم' },
    { name: 'Xiaomi', slug: 'xiaomi', country: 'China', description: 'شاومي — كفاءة عالية بأفضل قيمة' },
    { name: 'Oppo', slug: 'oppo', country: 'China', description: 'أوبو — كاميرات متقدمة وتصميم أنيق' },
    { name: 'Realme', slug: 'realme', country: 'China', description: 'ريلمي — قوة بأفضل سعر' },
    { name: 'Honor', slug: 'honor', country: 'China', description: 'هونر — تصميم أنيق وأداء متطور' },
    { name: 'Nothing', slug: 'nothing', country: 'UK', description: 'ناثنغ — تصميم شفاف ومستقبل التكنولوجيا' },
    { name: 'Infinix', slug: 'infinix', country: 'China', description: 'إنفينيكس — بسعر منافس وأداء قوي' },
  ]
  const brands: Prisma.Brand[] = []
  for (const b of brandData) {
    const logoUrl = localImage('brands', b.slug)
    const brand = await db.brand.upsert({
      where: { slug: b.slug },
      update: { logoUrl },
      create: { ...b, logoUrl, isActive: true },
    })
    brands.push(brand)
  }
  console.log(`  ✓ ${brands.length} brands`)

  // ---------- Categories ----------
  const categoryData = [
    { name: 'هواتف ذكية', slug: 'smartphones', icon: 'Smartphone', sortOrder: 1 },
    { name: 'أجهزة لوحية', slug: 'tablets', icon: 'Tablet', sortOrder: 2 },
    { name: 'سماعات', slug: 'audio', icon: 'Headphones', sortOrder: 3 },
    { name: 'إكسسوارات', slug: 'accessories', icon: 'Cable', sortOrder: 4 },
    { name: 'شواحن', slug: 'chargers', icon: 'BatteryCharging', sortOrder: 5 },
    { name: 'ساعات ذكية', slug: 'wearables', icon: 'Watch', sortOrder: 6 },
    { name: 'كاميرات', slug: 'cameras', icon: 'Camera', sortOrder: 7 },
    { name: 'لابتوب', slug: 'laptops', icon: 'Laptop', sortOrder: 8 },
  ]
  const categories: Prisma.Category[] = []
  for (const c of categoryData) {
    const imageUrl = localImage('categories', c.slug)
    const cat = await db.category.upsert({
      where: { slug: c.slug },
      update: { imageUrl },
      create: { ...c, imageUrl, isActive: true },
    })
    categories.push(cat)
  }
  console.log(`  ✓ ${categories.length} categories`)

  // ---------- Products ----------
  // Mapping: each product uses its real local image filename
  const productSeeds: SeedProduct[] = [
    { n: 'iPhone 15 Pro Max', b: 'apple', c: 'smartphones', img: 'iphone-15-pro-max', p: 74999, cp: 68000, featured: true, best: true, storage: ['256GB', '512GB', '1TB'], colors: ['تيتانيوم طبيعي', 'تيتانيوم أسود', 'تيتانيوم أزرق'] },
    { n: 'iPhone 15', b: 'apple', c: 'smartphones', img: 'iphone-15', p: 42999, cp: 39000, featured: true, storage: ['128GB', '256GB'], colors: ['أسود', 'أزرق', 'وردي', 'أخضر'] },
    { n: 'iPhone 14', b: 'apple', c: 'smartphones', img: 'iphone-14', p: 35999, cp: 32000, best: true, storage: ['128GB', '256GB'], colors: ['أسود', 'أبيض', 'أزرق', 'أحمر'] },
    { n: 'Samsung Galaxy S24 Ultra', b: 'samsung', c: 'smartphones', img: 'galaxy-s24-ultra', p: 64999, cp: 59000, featured: true, best: true, sale: true, cp2: 72999, storage: ['256GB', '512GB', '1TB'], colors: ['أسود تيتانيوم', 'رمادي تيتانيوم', 'بنفسجي تيتانيوم'] },
    { n: 'Samsung Galaxy S24', b: 'samsung', c: 'smartphones', img: 'galaxy-s24', p: 38999, cp: 35000, storage: ['128GB', '256GB'], colors: ['أسود', 'رمادي', 'أصفر', 'بنفسجي'] },
    { n: 'Samsung Galaxy A55', b: 'samsung', c: 'smartphones', img: 'galaxy-a55', p: 17999, cp: 15500, best: true, storage: ['128GB', '256GB'], colors: ['أسود', 'أزرق فاتح', 'أصفر'] },
    { n: 'Samsung Galaxy A15', b: 'samsung', c: 'smartphones', img: 'galaxy-a15', p: 8999, cp: 7800, storage: ['128GB'], colors: ['أسود', 'أزرق', 'أخضر'] },
    { n: 'Xiaomi 14 Pro', b: 'xiaomi', c: 'smartphones', img: 'xiaomi-14-pro', p: 42999, cp: 38500, featured: true, storage: ['256GB', '512GB'], colors: ['أسود', 'أبيض', 'أخضر'] },
    { n: 'Xiaomi Redmi Note 13 Pro', b: 'xiaomi', c: 'smartphones', img: 'redmi-note-13-pro', p: 13999, cp: 11800, best: true, sale: true, cp2: 15999, storage: ['128GB', '256GB'], colors: ['أسود', 'بنفسجي', 'أزرق'] },
    { n: 'Xiaomi Redmi 13C', b: 'xiaomi', c: 'smartphones', img: 'redmi-13c', p: 6499, cp: 5500, storage: ['128GB'], colors: ['أسود', 'أزرق', 'أخضر'] },
    { n: 'Oppo Reno 11 Pro', b: 'oppo', c: 'smartphones', img: 'oppo-reno-11-pro', p: 28999, cp: 25500, featured: true, storage: ['256GB', '512GB'], colors: ['أسود', 'أخضر'] },
    { n: 'Oppo A79', b: 'oppo', c: 'smartphones', img: 'oppo-a79', p: 12999, cp: 11000, storage: ['256GB'], colors: ['أسود', 'بنفسجي'] },
    { n: 'Realme 12 Pro+', b: 'realme', c: 'smartphones', img: 'realme-12-pro-plus', p: 22999, cp: 20000, featured: true, storage: ['256GB', '512GB'], colors: ['أسود', 'أزرق', 'بيج'] },
    { n: 'Realme C67', b: 'realme', c: 'smartphones', img: 'realme-c67', p: 8499, cp: 7200, best: true, storage: ['128GB', '256GB'], colors: ['أسود', 'أخضر', 'أصفر'] },
    { n: 'Honor Magic6 Pro', b: 'honor', c: 'smartphones', img: 'honor-magic6-pro', p: 45999, cp: 41000, featured: true, storage: ['256GB', '512GB'], colors: ['أسود', 'أخضر', 'أبيض'] },
    { n: 'Honor X9b', b: 'honor', c: 'smartphones', img: 'honor-x9b', p: 14999, cp: 12800, storage: ['256GB'], colors: ['أسود', 'أزرق', 'برتقالي'] },
    { n: 'Nothing Phone 2', b: 'nothing', c: 'smartphones', img: 'nothing-phone-2', p: 32999, cp: 29500, newArrival: true, storage: ['256GB', '512GB'], colors: ['أسود', 'أبيض'] },
    { n: 'Infinix Note 40 Pro', b: 'infinix', c: 'smartphones', img: 'infinix-note-40-pro', p: 11999, cp: 10200, newArrival: true, storage: ['256GB'], colors: ['أسود', 'بنفسجي'] },
    // Tablets
    { n: 'iPad Air 5', b: 'apple', c: 'tablets', img: 'ipad-air-5', p: 32999, cp: 29500, featured: true, storage: ['64GB', '256GB'], colors: ['رمادي فضائي', 'وردي', 'بنفسجي', 'أزرق'] },
    { n: 'iPad 10', b: 'apple', c: 'tablets', img: 'ipad-10', p: 22999, cp: 20500, storage: ['64GB', '256GB'], colors: ['أزرق', 'وردي', 'أصفر', 'فضي'] },
    { n: 'Samsung Galaxy Tab S9', b: 'samsung', c: 'tablets', img: 'galaxy-tab-s9', p: 38999, cp: 35000, storage: ['128GB', '256GB'], colors: ['رمادي', 'بيج'] },
    { n: 'Xiaomi Pad 6', b: 'xiaomi', c: 'tablets', img: 'xiaomi-pad-6', p: 14999, cp: 12800, best: true, storage: ['128GB', '256GB'], colors: ['أسود', 'رمادي', 'أزرق'] },
    // Audio
    { n: 'AirPods Pro 2', b: 'apple', c: 'audio', img: 'airpods-pro-2', p: 11999, cp: 10000, featured: true, best: true, sale: true, cp2: 13999, colors: ['أبيض'] },
    { n: 'AirPods 3', b: 'apple', c: 'audio', img: 'airpods-3', p: 7499, cp: 6200, colors: ['أبيض'] },
    { n: 'Galaxy Buds3 Pro', b: 'samsung', c: 'audio', img: 'galaxy-buds3-pro', p: 8999, cp: 7500, newArrival: true, colors: ['أبيض', 'رمادي'] },
    { n: 'Redmi Buds 5 Pro', b: 'xiaomi', c: 'audio', img: 'redmi-buds-5-pro', p: 2999, cp: 2400, best: true, colors: ['أبيض', 'أسود'] },
    // Accessories
    { n: 'Apple MagSafe Charger', b: 'apple', c: 'chargers', img: 'magsafe-charger', p: 2499, cp: 2000, colors: ['أبيض'] },
    { n: 'Samsung 25W Charger', b: 'samsung', c: 'chargers', img: 'samsung-25w-charger', p: 999, cp: 750, colors: ['أسود'] },
    { n: 'Anker PowerWave', b: 'xiaomi', c: 'chargers', img: 'anker-powerwave', p: 1499, cp: 1100, colors: ['أسود'] },
    { n: 'iPhone 15 Clear Case', b: 'apple', c: 'accessories', img: 'iphone-15-case', p: 1299, cp: 900, colors: ['شفاف'] },
    { n: 'Galaxy S24 Silicone Cover', b: 'samsung', c: 'accessories', img: 'galaxy-s24-cover', p: 899, cp: 600, colors: ['أسود', 'أزرق', 'بنفسجي'] },
    // Wearables
    { n: 'Apple Watch Series 9', b: 'apple', c: 'wearables', img: 'apple-watch-9', p: 18999, cp: 16500, featured: true, colors: ['منتصف الليل', 'نجومي', 'فضي', 'وردي'] },
    { n: 'Galaxy Watch6', b: 'samsung', c: 'wearables', img: 'galaxy-watch6', p: 13999, cp: 12000, best: true, colors: ['رمادي', 'ذهبي', 'فضي'] },
    { n: 'Xiaomi Watch S3', b: 'xiaomi', c: 'wearables', img: 'xiaomi-watch-s3', p: 4999, cp: 4000, newArrival: true, colors: ['أسود', 'فضي'] },
    // Camera
    { n: 'Canon EOS R50', b: 'apple', c: 'cameras', img: 'canon-eos-r50', p: 35999, cp: 32000, storage: ['Kit'], colors: ['أسود', 'أبيض'] },
  ]

  // Delete existing products (full re-seed)
  await db.product.deleteMany({})
  console.log('  ✓ Cleared existing products')

  let productCount = 0
  for (let i = 0; i < productSeeds.length; i++) {
    const s = productSeeds[i]
    const brand = brands.find(b => b.slug === s.b)!
    const category = categories.find(c => c.slug === s.c)!
    const slug = `${s.b}-${s.n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`
    const sku = `ASK-${(i + 1).toString().padStart(4, '0')}`

    // Primary image: real local image
    const primaryImage = localImage('products', s.img)

    const product = await db.product.create({
      data: {
        sku,
        name: s.n,
        slug,
        description: `${s.n} — تجربة استثنائية بأحدث التقنيات. تصميم أنيق وأداء فائق من ${brand.name}.`,
        longDescription: `${s.n} هو الجيل الأحدث من ${brand.name}، يجمع بين الأناقة والقوة في تصميم احترافي. يأتي بشاشة عالية الدقة ومعالج فائق السرعة وكاميرا متطورة تلتقط أدق التفاصيل. بطارية تدوم طوال اليوم مع دعم الشحن السريع. تجربة استخدام فاخرة بمعايير عالمية.`,
        brandId: brand.id,
        categoryId: category.id,
        price: s.p,
        comparePrice: s.cp2 ?? (s.sale ? Math.round(s.p * 1.15) : null),
        costPrice: s.cp,
        currency: 'EGP',
        isActive: true,
        isFeatured: !!s.featured,
        isBestSeller: !!s.best,
        isNewArrival: !!s.newArrival,
        isOnSale: !!s.sale,
        rating: 3.8 + (i % 12) / 10,
        reviewCount: 12 + (i * 7) % 240,
        soldCount: 50 + (i * 23) % 1500,
        viewCount: 200 + (i * 89) % 5000,
        weight: 0.4,
        dimensions: '15 × 7 × 0.8 cm',
        warranty: 'سنة وكيل',
        tags: [s.b, s.c].join(','),
      },
    })

    // Images — only the real primary image (skip placeholder extra angles if not available)
    if (primaryImage) {
      await db.productImage.create({
        data: {
          productId: product.id,
          url: primaryImage,
          altText: `${s.n} - صورة أمامية`,
          sortOrder: 0,
        },
      })
    }

    // Variants — storage × colors (max 6)
    const storageOpts: string[] = s.storage || ['Standard']
    const colorOpts: string[] = s.colors || ['افتراضي']
    let vIdx = 0
    for (const storage of storageOpts) {
      for (const color of colorOpts) {
        if (vIdx >= 6) break
        const variantSku = `${sku}-${storage}-${color}`.replace(/\s+/g, '')
        const priceDelta = storage.includes('512') ? 6000 : storage.includes('1TB') ? 14000 : storage.includes('256') ? 2500 : 0
        await db.productVariant.create({
          data: {
            productId: product.id,
            name: `${storage} - ${color}`,
            sku: variantSku,
            price: s.p + priceDelta,
            stock: 5 + (i * 3 + vIdx) % 60,
            reservedStock: 0,
            attributes: JSON.stringify({ storage, color }),
            isActive: true,
          },
        })
        vIdx++
      }
    }
    productCount++
  }
  console.log(`  ✓ ${productCount} products with real images & variants`)

  // ---------- Coupons ----------
  const coupons = [
    { code: 'WELCOME10', type: Prisma.CouponType.PERCENTAGE, value: 10, description: 'خصم 10% لأول طلب', minSubtotal: 1000, usageLimit: 1000, endsAt: new Date(Date.now() + 90 * 24 * 3600 * 1000) },
    { code: 'SAVE500', type: Prisma.CouponType.FIXED, value: 500, description: 'خصم 500 جنيه', minSubtotal: 5000, usageLimit: 500, endsAt: new Date(Date.now() + 60 * 24 * 3600 * 1000) },
    { code: 'FREESHIP', type: Prisma.CouponType.FREE_SHIPPING, value: 0, description: 'شحن مجاني', minSubtotal: 2000, usageLimit: 1000, endsAt: new Date(Date.now() + 30 * 24 * 3600 * 1000) },
    { code: 'VIP15', type: Prisma.CouponType.PERCENTAGE, value: 15, description: 'خصم 15% للعملاء المميزين', minSubtotal: 10000, usageLimit: 200, endsAt: new Date(Date.now() + 120 * 24 * 3600 * 1000) },
  ]
  for (const c of coupons) {
    await db.coupon.upsert({
      where: { code: c.code },
      update: {},
      create: { ...c, startsAt: new Date(), isActive: true, appliesTo: Prisma.CouponTarget.ALL },
    })
  }
  console.log(`  ✓ ${coupons.length} coupons`)

  // ---------- Shipping ----------
  const shipping = [
    { name: 'شحن عادي', code: 'STANDARD', baseCost: 50, perKgCost: 5, estimatedDays: 4, freeShippingThreshold: 5000, sortOrder: 1 },
    { name: 'شحن سريع', code: 'EXPRESS', baseCost: 120, perKgCost: 10, estimatedDays: 2, sortOrder: 2 },
    { name: 'توصيل خلال 24 ساعة', code: 'NEXT_DAY', baseCost: 200, perKgCost: 15, estimatedDays: 1, sortOrder: 3 },
    { name: 'استلام من الفرع', code: 'PICKUP', baseCost: 0, perKgCost: 0, estimatedDays: 0, sortOrder: 4 },
  ]
  for (const s of shipping) {
    await db.shippingMethod.upsert({
      where: { code: s.code },
      update: {},
      create: { ...s, isActive: true },
    })
  }
  console.log(`  ✓ ${shipping.length} shipping methods`)

  // ---------- Reviews ----------
  const reviewAuthors = ['أحمد محمد', 'محمود علي', 'سارة حسن', 'كريم عادل', 'نورا أحمد', 'محمد إبراهيم', 'فاطمة سعيد', 'يوسف خالد', 'مريم عماد', 'عمر طارق']
  const reviewTitles = ['منتج ممتاز', 'جودة عالية', 'توصيل سريع', 'السعر مناسب', 'أنصح به', 'أفضل منتج', 'تجربة رائعة', 'يعمل بكفاءة']
  const reviewComments = [
    'منتج رائع ويستحق الثمن، التوصيل كان سريع جداً والتغليف ممتاز.',
    'جودة بناء ممتازة والأداء فاق توقعاتي. سأشتري مرة أخرى.',
    'وصل في الوقت المحدد والمنتج كما هو موصوف تماماً.',
    'السعر مناسب جداً مقارنة بالجودة. تجربة شراء موفقة.',
    'أنصح به بشدة، المنتج أصلي والبائع محترم.',
    'أفضل شراء قمت به هذا العام، شكراً لكم.',
    'تجربة رائعة من البداية للنهاية، خدمة عملاء ممتازة.',
    'يعمل بكفاءة عالية ولم أواجه أي مشاكل حتى الآن.',
  ]
  const products = await db.product.findMany({ select: { id: true } })
  let reviewCount = 0
  for (const p of products) {
    const num = 3 + (Math.floor(Math.random() * 4))
    for (let i = 0; i < num; i++) {
      await db.review.create({
        data: {
          productId: p.id,
          authorName: pick(reviewAuthors, reviewCount + i),
          rating: 3 + ((reviewCount + i) % 3),
          title: pick(reviewTitles, reviewCount + i),
          comment: pick(reviewComments, reviewCount + i),
          isVerified: true,
          isApproved: true,
        },
      })
      reviewCount++
    }
  }
  console.log(`  ✓ ${reviewCount} reviews`)

  // ---------- Sample orders ----------
  const orderStatuses = [Prisma.OrderStatus.PENDING, Prisma.OrderStatus.CONFIRMED, Prisma.OrderStatus.SHIPPED, Prisma.OrderStatus.DELIVERED, Prisma.OrderStatus.DELIVERED, Prisma.OrderStatus.DELIVERED]
  const payStatuses = [Prisma.PaymentStatus.PAID, Prisma.PaymentStatus.PAID, Prisma.PaymentStatus.PAID, Prisma.PaymentStatus.PENDING]
  for (let i = 0; i < 8; i++) {
    const dateOffset = i * 3 * 24 * 3600 * 1000
    const product = pick(products, i + 3)
    const fullP = await db.product.findUnique({ where: { id: product.id }, include: { images: true } })
    if (!fullP) continue
    const qty = 1 + (i % 3)
    const subtotal = fullP.price * qty
    const shippingCost = 50
    const total = subtotal + shippingCost
    const orderNumber = `ASK-${Date.now().toString().slice(-6)}${i.toString().padStart(2, '0')}`
    const order = await db.order.create({
      data: {
        orderNumber,
        guestEmail: `customer${i}@example.com`,
        status: pick(orderStatuses, i),
        paymentStatus: pick(payStatuses, i),
        subtotal,
        shippingCost,
        tax: 0,
        total,
        currency: 'EGP',
        shippingMethod: 'STANDARD',
        createdAt: new Date(Date.now() - dateOffset),
        items: {
          create: [{
            name: fullP.name,
            sku: fullP.sku,
            price: fullP.price,
            quantity: qty,
            total,
            imageUrl: fullP.images[0]?.url,
            productIdRef: fullP.id,
          }],
        },
        address: {
          create: {
            firstName: pick(reviewAuthors, i).split(' ')[0],
            lastName: pick(reviewAuthors, i).split(' ')[1] || 'عبد الله',
            email: `customer${i}@example.com`,
            phone: '+20100' + (10000000 + i * 1111).toString(),
            address1: 'شارع التحرير، وسط البلد',
            city: pick(['القاهرة', 'الإسكندرية', 'الجيزة', 'المنصورة'], i),
            country: 'Egypt',
          },
        },
      },
    })
    await db.orderStatusHistory.create({
      data: { orderId: order.id, status: order.status, note: 'تم إنشاء الطلب', createdAt: order.createdAt },
    })
  }
  console.log(`  ✓ 8 sample orders`)

  // ---------- Settings ----------
  const settings = [
    { key: 'store.name', value: 'أسكندراني فون' },
    { key: 'store.currency', value: 'EGP' },
    { key: 'store.taxRate', value: '0' },
    { key: 'store.phone', value: '+20 100 123 4567' },
    { key: 'store.email', value: 'support@askandarani.phone' },
    { key: 'store.address', value: 'الإسكندرية، مصر' },
    { key: 'store.minOrder', value: '500' },
    { key: 'store.freeShippingThreshold', value: '5000' },
  ]
  for (const s of settings) {
    await db.setting.upsert({ where: { key: s.key }, update: {}, create: s })
  }
  console.log(`  ✓ ${settings.length} settings`)

  console.log('✅ Premium seed completed!')
  console.log(`   Admin login: ${adminEmail} / ${adminPassword}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
