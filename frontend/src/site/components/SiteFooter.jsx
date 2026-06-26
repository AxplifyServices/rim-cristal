'use client'

import Link from 'next/link'
import { useSiteI18n } from '../i18n/SiteI18nProvider'

const FACEBOOK_URL =
  process.env.NEXT_PUBLIC_FACEBOOK_URL ||
  'https://web.facebook.com/people/Kaystia/61591218699198/'

const INSTAGRAM_URL =
  process.env.NEXT_PUBLIC_INSTAGRAM_URL ||
  'https://www.instagram.com/kaystia_home/'

function normalizeWhatsAppNumber(value) {
  return String(value || '').replace(/\D/g, '')
}

function FacebookIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M13.5 22v-8h2.8l.4-3.2h-3.2V8.7c0-.9.3-1.6 1.7-1.6H17V4.2c-.3 0-1.4-.2-2.6-.2-2.6 0-4.4 1.6-4.4 4.5v2.3H7V14h3v8h3.5Z"
      />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9ZM18 5.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"
      />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M12 2a9.8 9.8 0 0 0-8.4 14.9L2 22l5.3-1.5A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.1-1.1l-.4-.2-3.1.9.9-3-.2-.4A8 8 0 1 1 12 20Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.7.9c-.1.2-.3.2-.5.1-1.4-.7-2.4-1.5-3.3-2.9-.2-.3.2-.5.6-1 .1-.2.1-.3 0-.5l-.7-1.7c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.7.7-1.1 1.7-1 2.7.1 1.3.7 2.6 1.6 3.6 1.7 2 3.8 3.5 6.3 4.2.8.2 1.7.3 2.5.1.9-.1 1.8-.8 2.2-1.6.2-.5.2-1 .1-1.1-.1-.2-.3-.2-.6-.4Z"
      />
    </svg>
  )
}

export default function SiteFooter() {
  const {
    locale,
    setLocale,
    t,
  } = useSiteI18n()

  const whatsappNumber =
    normalizeWhatsAppNumber(
      process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
    )

  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}`
    : ''

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

          <div
            className="footer-social-links"
            aria-label={t('footer.socialNetworks')}
          >
            <a
              href={FACEBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('footer.facebook')}
              title={t('footer.facebook')}
            >
              <FacebookIcon />
            </a>

            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('footer.instagram')}
              title={t('footer.instagram')}
            >
              <InstagramIcon />
            </a>

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('footer.whatsapp')}
                title={t('footer.whatsapp')}
              >
                <WhatsAppIcon />
              </a>
            )}
          </div>
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