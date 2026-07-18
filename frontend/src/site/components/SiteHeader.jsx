'use client'

import Link from 'next/link'
import {
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation'
import {
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  PRODUCT_SECTIONS,
} from '../constants/productSections'
import { useCart } from '../context/CartContext'
import { useSiteI18n } from '../i18n/SiteI18nProvider'

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        cx="11"
        cy="11"
        r="7"
      />

      <path d="m20 20-3.6-3.6" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="8"
        r="4"
      />

      <path d="M4.8 21a7.2 7.2 0 0 1 14.4 0" />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" />
    </svg>
  )
}

function BagIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M5 8h14l1 13H4L5 8Z" />

      <path d="M9 9V6a3 3 0 0 1 6 0v3" />
    </svg>
  )
}

export default function SiteHeader() {
  const pathname =
    usePathname()

  const searchParams =
    useSearchParams()

  const router =
    useRouter()

  const searchInputRef =
    useRef(null)

  const [menuOpen, setMenuOpen] =
    useState(false)

  const [
    searchOpen,
    setSearchOpen,
  ] = useState(false)

  const [
    searchValue,
    setSearchValue,
  ] = useState('')

  const { count } = useCart()

  const {
    locale,
    setLocale,
    t,
  } = useSiteI18n()

  const selectedSection =
    searchParams.get(
      'rubrique'
    ) || ''

  function closeAllPanels() {
    setMenuOpen(false)
    setSearchOpen(false)
  }

  function isSectionActive(
    sectionValue
  ) {
    return (
      pathname === '/shop' &&
      selectedSection ===
        sectionValue
    )
  }

  function submitSearch(event) {
    event.preventDefault()

    const normalized =
      searchValue.trim()

    closeAllPanels()

    if (!normalized) {
      router.push('/shop')
      return
    }

    router.push(
      `/shop?search=${encodeURIComponent(
        normalized
      )}&page=1`
    )
  }

  useEffect(() => {
    closeAllPanels()
  }, [
    pathname,
    selectedSection,
  ])

  useEffect(() => {
    if (
      !menuOpen &&
      !searchOpen
    ) {
      return undefined
    }

    function handleEscape(
      event
    ) {
      if (
        event.key ===
        'Escape'
      ) {
        closeAllPanels()
      }
    }

    const previousOverflow =
      document.body.style
        .overflow

    document.body.style.overflow =
      'hidden'

    window.addEventListener(
      'keydown',
      handleEscape
    )

    return () => {
      document.body.style.overflow =
        previousOverflow

      window.removeEventListener(
        'keydown',
        handleEscape
      )
    }
  }, [
    menuOpen,
    searchOpen,
  ])

  useEffect(() => {
    if (
      searchOpen &&
      searchInputRef.current
    ) {
      window.setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    }
  }, [searchOpen])

  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <button
            type="button"
            className={
              menuOpen
                ? 'site-menu-button is-open'
                : 'site-menu-button'
            }
            onClick={() => {
              setMenuOpen(
                current =>
                  !current
              )

              setSearchOpen(false)
            }}
            aria-label={
              menuOpen
                ? t(
                    'nav.closeMenu'
                  )
                : t(
                    'nav.openMenu'
                  )
            }
            aria-expanded={
              menuOpen
            }
            aria-controls="site-mobile-navigation"
          >
            <span />
            <span />
            <span />
          </button>

          <Link
            href="/"
            className="site-brand"
            onClick={
              closeAllPanels
            }
          >
            <span className="site-brand-mark">
              H
            </span>

            <span className="site-brand-copy">
              <strong>
                CasaLuxuryDecor
              </strong>

              <small>
                Maison d’artiste
              </small>
            </span>
          </Link>

          <nav
            className="site-desktop-navigation"
            aria-label={t(
              'nav.mainNavigation'
            )}
          >
            {PRODUCT_SECTIONS.map(
              section => (
                <Link
                  key={
                    section.value
                  }
                  href={{
                    pathname:
                      '/shop',

                    query: {
                      rubrique:
                        section.value,

                      page: '1',
                    },
                  }}
                  className={
                    isSectionActive(
                      section.value
                    )
                      ? 'site-navigation-link is-active'
                      : 'site-navigation-link'
                  }
                >
                  {t(
                    section.translationKey
                  )}
                </Link>
              )
            )}
          </nav>

          <div className="site-header-actions">
            <button
              type="button"
              className="site-header-search-trigger"
              onClick={() => {
                setSearchOpen(
                  current =>
                    !current
                )

                setMenuOpen(false)
              }}
              aria-label={t(
                'nav.search'
              )}
              aria-expanded={
                searchOpen
              }
            >
              <SearchIcon />

              <span>
                {t(
                  'nav.searchPlaceholder'
                )}
              </span>
            </button>

            <label className="site-language-select">
              <span className="sr-only">
                {t(
                  'nav.language'
                )}
              </span>

              <select
                value={locale}
                onChange={event => {
                  setLocale(
                    event.target.value
                  )
                }}
              >
                <option value="fr">
                  FR
                </option>

                <option value="en">
                  EN
                </option>
              </select>
            </label>

            <Link
              href="/admin/login"
              className="site-header-icon-link site-account-link"
              aria-label={t(
                'nav.account'
              )}
            >
              <UserIcon />
            </Link>

            <button
              type="button"
              className="site-header-icon-link site-favorites-button"
              aria-label={t(
                'nav.favorites'
              )}
              onClick={() => {
                router.push('/shop')
              }}
            >
              <HeartIcon />
            </button>

            <Link
              href="/cart"
              className="site-header-icon-link site-cart-icon-link"
              aria-label={t(
                'nav.cart'
              )}
            >
              <BagIcon />

              {count > 0 && (
                <span className="site-cart-count">
                  {count > 99
                    ? '99+'
                    : count}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <div
        className={
          menuOpen ||
          searchOpen
            ? 'site-header-backdrop is-visible'
            : 'site-header-backdrop'
        }
        onClick={
          closeAllPanels
        }
        aria-hidden="true"
      />

      <aside
        id="site-mobile-navigation"
        className={
          menuOpen
            ? 'site-mobile-navigation is-open'
            : 'site-mobile-navigation'
        }
        aria-hidden={
          !menuOpen
        }
      >
        <div className="site-mobile-navigation-header">
          <strong>
            {t('nav.menu')}
          </strong>

          <button
            type="button"
            onClick={
              closeAllPanels
            }
            aria-label={t(
              'nav.closeMenu'
            )}
          >
            ×
          </button>
        </div>

        <form
          className="site-mobile-search"
          onSubmit={
            submitSearch
          }
        >
          <SearchIcon />

          <input
            type="search"
            value={searchValue}
            onChange={event => {
              setSearchValue(
                event.target.value
              )
            }}
            placeholder={t(
              'nav.searchPlaceholder'
            )}
          />
        </form>

        <nav
          className="site-mobile-navigation-links"
          aria-label={t(
            'nav.mainNavigation'
          )}
        >
          <Link
            href="/"
            onClick={
              closeAllPanels
            }
          >
            {t('nav.home')}
          </Link>

          {PRODUCT_SECTIONS.map(
            section => (
              <Link
                key={
                  section.value
                }
                href={{
                  pathname:
                    '/shop',

                  query: {
                    rubrique:
                      section.value,

                    page: '1',
                  },
                }}
                onClick={
                  closeAllPanels
                }
              >
                {t(
                  section.translationKey
                )}
              </Link>
            )
          )}

          <Link
            href="/contact"
            onClick={
              closeAllPanels
            }
          >
            {t('nav.contact')}
          </Link>
        </nav>

        <div className="site-mobile-navigation-footer">
          <Link
            href="/admin/login"
            onClick={
              closeAllPanels
            }
          >
            <UserIcon />
            {t('nav.account')}
          </Link>

          <Link
            href="/cart"
            onClick={
              closeAllPanels
            }
          >
            <BagIcon />
            {t('nav.cart')}

            {count > 0 && (
              <span>
                {count}
              </span>
            )}
          </Link>
        </div>
      </aside>

      <section
        className={
          searchOpen
            ? 'site-search-panel is-open'
            : 'site-search-panel'
        }
        aria-hidden={
          !searchOpen
        }
      >
        <form
          className="site-search-panel-form"
          onSubmit={
            submitSearch
          }
        >
          <SearchIcon />

          <input
            ref={searchInputRef}
            type="search"
            value={searchValue}
            onChange={event => {
              setSearchValue(
                event.target.value
              )
            }}
            placeholder={t(
              'nav.searchPlaceholder'
            )}
          />

          <button type="submit">
            {t(
              'nav.searchAction'
            )}
          </button>

          <button
            type="button"
            className="site-search-panel-close"
            onClick={
              closeAllPanels
            }
            aria-label={t(
              'nav.closeSearch'
            )}
          >
            ×
          </button>
        </form>
      </section>
    </>
  )
}