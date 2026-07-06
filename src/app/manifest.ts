/**
 * Manifest — Full PWA support
 * Enables install prompts, shortcuts, and rich app experience on mobile.
 */
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'أسكندراني فون — متجر الهواتف الذكية',
    short_name: 'أسكندراني',
    description: 'متجر الهواتف الذكية والإكسسوارات الأصلية بأفضل الأسعار في مصر',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#10b981',
    lang: 'ar',
    dir: 'rtl',
    scope: '/',
    icons: [
      {
        src: '/askandarani-brand-logo.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/askandarani-brand-logo.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'أحدث المنتجات',
        short_name: 'الجديد',
        description: 'استعرض أحدث المنتجات',
        url: '/products?sort=newest',
        icons: [{ src: '/askandarani-brand-logo.svg', sizes: 'any' }],
      },
      {
        name: 'العروض والتخفيضات',
        short_name: 'العروض',
        description: 'استعرض العروض والتخفيضات',
        url: '/products?isOnSale=true',
        icons: [{ src: '/askandarani-brand-logo.svg', sizes: 'any' }],
      },
      {
        name: 'سلة التسوق',
        short_name: 'السلة',
        description: 'عرض سلة التسوق',
        url: '/cart',
        icons: [{ src: '/askandarani-brand-logo.svg', sizes: 'any' }],
      },
    ],
    categories: ['shopping', 'electronics'],
    prefer_related_applications: false,
  }
}
