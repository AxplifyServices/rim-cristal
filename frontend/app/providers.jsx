'use client'

import { CartProvider } from '../src/site/context/CartContext'
import {
  FavoritesProvider,
} from '../src/site/context/FavoritesContext'
import { SiteI18nProvider } from '../src/site/i18n/SiteI18nProvider'

export function SiteProviders({
  children,
}) {
  return (
    <SiteI18nProvider>
      <FavoritesProvider>
        <CartProvider>
          {children}
        </CartProvider>
      </FavoritesProvider>
    </SiteI18nProvider>
  )
}