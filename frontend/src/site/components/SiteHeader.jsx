'use client'

import Link from 'next/link'
import {
  usePathname,
  useSearchParams,
} from 'next/navigation'
import {
  useEffect,
  useState,
} from 'react'
import { useCart } from '../context/CartContext'
import { useSiteI18n } from '../i18n/SiteI18nProvider'
import {
  PRODUCT_SECTIONS,
} from '../constants/productSections'

export default function SiteHeader() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [open, setOpen] = useState(false)

  const { count } = useCart()
  const {
    locale,
    setLocale,
    t,
  } = useSiteI18n()

  const selectedSection =
    searchParams.get('rubrique') || ''

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

  function isHomeActive() {
    return pathname === '/'
  }

  function isSectionActive(sectionValue) {
    return (
      pathname === '/shop' &&
      selectedSection === sectionValue
    )
  }

  useEffect(() => {
    closeMenu()
  }, [pathname, selectedSection])

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape') {
        closeMenu()
      }
    }

    window.addEventListener(
      'keydown',
      handleEscape
    )

    return () => {
      window.removeEventListener(
        'keydown',
        handleEscape
      )
    }
  }, [])

  return (
    <header className="site-header">
      <div className="container header-row">
        <button
          type="button"
          className={
            open
              ? 'menu-button is-open'
              : 'menu-button'
          }
          onClick={() => {
            setOpen(current => !current)
          }}
          aria-label={
            open
              ? t('nav.closeMenu')
              : t('nav.openMenu')
          }
          aria-expanded={open}
          aria-controls="main-navigation"
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
          Rim Cristal
        </Link>

        <nav
          id="main-navigation"
          aria-label={t('nav.mainNavigation')}
          className={
            open
              ? 'main-nav is-open'
              : 'main-nav'
          }
        >
          <Link
            href="/"
            className={
              isHomeActive()
                ? 'nav-link is-active'
                : 'nav-link'
            }
            onClick={closeMenu}
          >
            {t('nav.home')}
          </Link>

          {PRODUCT_SECTIONS.map(section => (
            <Link
              key={section.value}
              href={{
                pathname: '/shop',
                query: {
                  rubrique: section.value,
                  page: '1',
                },
              }}
              className={
                isSectionActive(section.value)
                  ? 'nav-link is-active'
                  : 'nav-link'
              }
              onClick={closeMenu}
            >
              {t(section.translationKey)}
            </Link>
          ))}
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
            onClick={closeMenu}
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