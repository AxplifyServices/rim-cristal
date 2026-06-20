'use client'

import Link from 'next/link'
import { useSiteI18n } from '../i18n/SiteI18nProvider'

export default function SiteFooter() {
  const {
    locale,
    setLocale,
    t,
  } = useSiteI18n()

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Link href="/" className="footer-brand">
            {t('brand')}
          </Link>

          <p className="footer-description">
            {t('footer.description')}
          </p>
        </div>

        <div>
          <h2 className="footer-title">
            {t('footer.navigation')}
          </h2>

          <nav className="footer-links">
            <Link href="/">
              {t('nav.home')}
            </Link>

            <Link href="/shop">
              {t('nav.shop')}
            </Link>

            <Link href="/contact">
              {t('nav.contact')}
            </Link>

            <Link href="/cart">
              {t('nav.cart')}
            </Link>
          </nav>
        </div>

        <div>
          <h2 className="footer-title">
            {t('footer.language')}
          </h2>

          <div className="footer-language">
            <button
              type="button"
              className={
                locale === 'fr'
                  ? 'is-active'
                  : ''
              }
              onClick={() => setLocale('fr')}
            >
              Français
            </button>

            <button
              type="button"
              className={
                locale === 'en'
                  ? 'is-active'
                  : ''
              }
              onClick={() => setLocale('en')}
            >
              English
            </button>
          </div>
        </div>
      </div>

<div className="container footer-bottom">
  © {new Date().getFullYear()}{' '}
  {t('brand')}.{' '}
  {t('footer.rights')}
</div>
    </footer>
  )
}