/**
 * Root Layout — RTL, fonts, theme provider, metadata.
 * Premium Dark + Gold theme based on uploaded logo.
 */
import type { Metadata, Viewport } from 'next'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import ServiceWorkerRegistrar from '@/components/pwa/ServiceWorkerRegistrar'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://askandarani.phone'),
  title: {
    default: 'أسكندراني فون — متجر الهواتف الذكية الفاخر',
    template: '%s | أسكندراني فون',
  },
  description: 'أسكندراني فون — وجهتك الأولى لشراء أحدث الهواتف الذكية والأجهزة اللوحية والإكسسوارات الأصلية بأفضل الأسعار في مصر. شحن سريع، ضمان وكيل، ودفع آمن.',
  keywords: ['هواتف ذكية', 'ايفون', 'سامسونج', 'شاومي', 'إكسسوارات موبايل', 'أسكندراني فون', 'مصر'],
  authors: [{ name: 'Askandarani Phone' }],
  creator: 'Askandarani Phone',
  publisher: 'Askandarani Phone',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'ar_EG',
    url: '/',
    siteName: 'أسكندراني فون',
    title: 'أسكندراني فون — متجر الهواتف الذكية الفاخر',
    description: 'أحدث الهواتف الذكية والإكسسوارات الأصلية بأفضل الأسعار',
    images: [{ url: '/askandarani-brand-logo.svg', width: 512, height: 512 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'أسكندراني فون',
    description: 'متجر الهواتف الذكية والإكسسوارات',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  category: 'commerce',
  icons: {
    icon: '/askandarani-favicon.svg',
    apple: '/askandarani-brand-logo.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1E40AF' },
    { media: '(prefers-color-scheme: dark)', color: '#0F1B3D' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'OnlineStore',
              name: 'أسكندراني فون',
              url: 'https://askandarani.phone',
              logo: 'https://askandarani.phone/askandarani-brand-logo.svg',
              description: 'متجر الهواتف الذكية والإكسسوارات الفاخر',
              address: {
                '@type': 'PostalAddress',
                addressCountry: 'EG',
                addressLocality: 'الإسكندرية',
              },
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://askandarani.phone/?search={query}',
                'query-input': 'required name=query',
              },
            }),
          }}
        />
        {/* PWA meta tags */}
        <link rel="apple-touch-icon" href="/askandarani-brand-logo.svg" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="أسكندراني" />
      </head>
      <body className="font-sans antialiased min-h-screen flex flex-col dark">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          {children}
          <Toaster position="top-center" richColors closeButton />
          <ServiceWorkerRegistrar />
        </ThemeProvider>
      </body>
    </html>
  )
}
