/**
 * Main App Page — single-page application with view-based routing.
 * Composes: Header, View (home/products/cart/checkout/admin/...), Footer, Drawers.
 *
 * SECURITY: Admin panel is completely separate from public store.
 * - No admin button visible in public UI
 * - Access via obscure URL hash only (not guessable)
 * - No keyboard shortcut (removed for security)
 * - Admin pages have NO shared header/footer
 * - All admin API routes protected by middleware + auth
 */
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Header } from '@/shared/components/header'
import { Footer } from '@/shared/components/footer'
import { CartDrawer } from '@/shared/components/cart-drawer'
import { SearchModal } from '@/shared/components/search-modal'
import { ErrorBoundary } from '@/shared/components/error-boundary'
import { useUIStore } from '@/shared/stores/ui.store'
import { useAuthStore } from '@/shared/stores/auth.store'
import { useCartSync } from '@/shared/hooks/queries'
import { useSession } from '@/shared/hooks/auth-queries'

import { HomePage } from '@/features/home/home-page'
import { ProductsPage } from '@/features/products/products-page'
import { ProductDetailPage } from '@/features/products/product-detail-page'
import { CheckoutPage } from '@/features/checkout/checkout-page'
import { PaymobResultPage } from '@/features/checkout/paymob-result-page'
import { OrderTrackingPage } from '@/features/orders/order-tracking-page'
import { AdminDashboard } from '@/features/admin/admin-dashboard'
import { AdminLoginPage } from '@/features/admin/admin-login'
import { AccountPage } from '@/features/account/account-page'
import { AboutPage } from '@/features/account/about-page'
import { ContactPage } from '@/features/account/contact-page'

// SECURITY: Obscure hash for admin access — not guessable, not indexed
const ADMIN_HASH = '#secure-dashboard-panel-2024'

function AppContent() {
  const { view, productSlug, setView } = useUIStore()
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  useCartSync() // Sync cart from server
  useSession() // Check admin session on load

  // Apply theme on mount
  useEffect(() => {
    const theme = useUIStore.getState().theme
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [])

  // Listen for obscure URL hash to access admin panel
  // SECURITY: No keyboard shortcut (removed for security)
  useEffect(() => {
    const checkHash = () => {
      if (typeof window !== 'undefined' && window.location.hash === ADMIN_HASH) {
        setView('admin')
      }
    }
    checkHash()
    window.addEventListener('hashchange', checkHash)
    return () => window.removeEventListener('hashchange', checkHash)
  }, [setView])

  // ===== ADMIN SECTION — completely separate from public store =====
  if (view === 'admin') {
    if (authLoading) {
      return (
        <div className="min-h-screen grid place-items-center gradient-premium">
          <div className="text-center">
            <div className="size-12 mx-auto rounded-full border-4 border-gold/30 border-t-gold animate-spin-gold mb-4" />
            <p className="text-sm text-muted-foreground">جاري التحقق من الجلسة...</p>
          </div>
        </div>
      )
    }

    if (!isAuthenticated) {
      // Show login page — NO header, NO footer, NO cart drawer — fully isolated
      return <AdminLoginPage />
    }

    // Authenticated — show admin dashboard ONLY (no public header/footer)
    return (
      <main className="flex-1 min-h-screen">
        <ErrorBoundary>
          <AdminDashboard />
        </ErrorBoundary>
      </main>
    )
  }

  // ===== PUBLIC STORE SECTION =====
  return (
    <>
      <Header />
      <main className="flex-1">
        <ErrorBoundary>
          {view === 'home' && <HomePage />}
          {view === 'products' && <ProductsPage />}
          {view === 'product-detail' && productSlug && <ProductDetailPage slug={productSlug} />}
          {view === 'checkout' && <CheckoutPage />}
          {view === 'paymob-result' && <PaymobResultPage />}
          {view === 'order-tracking' && <OrderTrackingPage />}
          {view === 'account' && <AccountPage />}
          {view === 'about' && <AboutPage />}
          {view === 'contact' && <ContactPage />}
        </ErrorBoundary>
      </main>
      <Footer />
      <CartDrawer />
      <SearchModal />
    </>
  )
}

export default function Home() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 30 * 1000,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}
