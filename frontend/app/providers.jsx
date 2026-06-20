'use client'

import { CartProvider } from '../src/site/context/CartContext'
import { SiteI18nProvider } from '../src/site/i18n/SiteI18nProvider'

export function SiteProviders({ children }) {
  return (
    <SiteI18nProvider>
      <CartProvider>{children}</CartProvider>
    </SiteI18nProvider>
  )
}