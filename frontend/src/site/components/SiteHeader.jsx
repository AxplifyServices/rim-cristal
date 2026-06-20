'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useCart } from '../context/CartContext'
import { useSiteI18n } from '../i18n/SiteI18nProvider'

export default function SiteHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const { count } = useCart()

  const {
    locale,
    setLocale,
    t,
  } = useSiteI18n()

  function closeMenu() {
    setOpen(false)
  }

  function toggleLocale() {
    setLocale(
      locale === 'fr'
        ? 'en'
        : 'fr'
    )
  }

  function linkClass(path) {
    return pathname === path
      ? 'nav-link is-active'
      : 'nav-link'
  }

  return (
    <header className="site-header">
      <div className="container header-row">
        <button
          type="button"
          className="menu-button"
          onClick={() => {
            setOpen(current => !current)
          }}
          aria-label="Ouvrir le menu"
          aria-expanded={open}
        >
          <span />
          <span />
          <span />
        </button>

        <Link
          href="/"
          className="brand"
          onClick={closeMenu}
        >
          Lux Lumina
        </Link>

        <nav
          className={
            open
              ? 'main-nav is-open'
              : 'main-nav'
          }
        >
          <Link
            href="/"
            className={linkClass('/')}
            onClick={closeMenu}
          >
            {t('nav.home')}
          </Link>

          <Link
            href="/shop"
            className={linkClass('/shop')}
            onClick={closeMenu}
          >
            {t('nav.shop')}
          </Link>

          <Link
            href="/contact"
            className={linkClass('/contact')}
            onClick={closeMenu}
          >
            {t('nav.contact')}
          </Link>
        </nav>

        <div className="header-actions">
          <button
            type="button"
            className="language-button"
            onClick={toggleLocale}
            aria-label="Changer la langue"
          >
            {locale.toUpperCase()}
          </button>

          <Link
            href="/cart"
            className="cart-link"
            aria-label={t('nav.cart')}
          >
            <span className="cart-label">
              {t('nav.cart')}
            </span>

            <span className="cart-count">
              {count}
            </span>
          </Link>
        </div>
      </div>
    </header>
  )
}