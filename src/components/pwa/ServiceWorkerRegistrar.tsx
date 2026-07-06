'use client'

import { useEffect } from 'react'

/**
 * ServiceWorkerRegistrar — registers the PWA service worker.
 * Must be a Client Component as it uses browser APIs.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration.scope)
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err)
        })
    }
  }, [])

  return null
}
