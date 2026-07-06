/**
 * UI Store — global UI state: view navigation, drawer/modal toggles, theme.
 * This replaces traditional routing in the SPA-like experience.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type View =
  | 'home'
  | 'products'
  | 'product-detail'
  | 'cart'
  | 'checkout'
  | 'paymob-result'
  | 'order-confirmation'
  | 'order-tracking'
  | 'account'
  | 'admin'
  | 'about'
  | 'contact'

interface UIState {
  view: View
  // Params for views
  productSlug: string | null
  orderNumber: string | null
  // Filters for products view
  productFilters: {
    search?: string
    categoryIds?: string[]
    brandIds?: string[]
    isFeatured?: boolean
    isBestSeller?: boolean
    isNewArrival?: boolean
    isOnSale?: boolean
    sort?: string
  }
  // Drawers / modals
  cartDrawerOpen: boolean
  searchModalOpen: boolean
  mobileMenuOpen: boolean
  // Theme
  theme: 'light' | 'dark'
  // Recently viewed
  recentlyViewed: string[]

  // Actions
  setView: (view: View, params?: { productSlug?: string; orderNumber?: string }) => void
  setProductFilters: (filters: Partial<UIState['productFilters']>) => void
  openCartDrawer: () => void
  closeCartDrawer: () => void
  toggleCartDrawer: () => void
  openSearchModal: () => void
  closeSearchModal: () => void
  toggleMobileMenu: () => void
  setTheme: (theme: 'light' | 'dark') => void
  toggleTheme: () => void
  addRecentlyViewed: (productId: string) => void
  resetFilters: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      view: 'home',
      productSlug: null,
      orderNumber: null,
      productFilters: {},
      cartDrawerOpen: false,
      searchModalOpen: false,
      mobileMenuOpen: false,
      theme: 'light',
      recentlyViewed: [],

      setView: (view, params) => {
        set({ view, productSlug: params?.productSlug ?? null, orderNumber: params?.orderNumber ?? null, mobileMenuOpen: false })
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
      },
      setProductFilters: (filters) =>
        set((state) => ({ productFilters: { ...state.productFilters, ...filters } })),
      openCartDrawer: () => set({ cartDrawerOpen: true }),
      closeCartDrawer: () => set({ cartDrawerOpen: false }),
      toggleCartDrawer: () => set((s) => ({ cartDrawerOpen: !s.cartDrawerOpen })),
      openSearchModal: () => set({ searchModalOpen: true }),
      closeSearchModal: () => set({ searchModalOpen: false }),
      toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),
      setTheme: (theme) => {
        set({ theme })
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', theme === 'dark')
        }
      },
      toggleTheme: () => set((s) => {
        const theme = s.theme === 'light' ? 'dark' : 'light'
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', theme === 'dark')
        }
        return { theme }
      }),
      addRecentlyViewed: (productId) => set((s) => ({
        recentlyViewed: [productId, ...s.recentlyViewed.filter(id => id !== productId)].slice(0, 12),
      })),
      resetFilters: () => set({ productFilters: {} }),
    }),
    {
      name: 'ask-ui-store',
      // Don't persist transient UI state
      partialize: (s) => ({
        theme: s.theme,
        recentlyViewed: s.recentlyViewed,
        productFilters: s.productFilters,
      }),
    }
  )
)
