'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  PRODUCT_SECTIONS,
} from '../constants/productSections'
import { useCart } from '../context/CartContext'
import { useSiteI18n } from '../i18n/SiteI18nProvider'
import {
  getProductFilters,
} from '../lib/products'

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

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="m9 5 7 7-7 7" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M6 6 18 18" />
      <path d="M18 6 6 18" />
    </svg>
  )
}

function buildShopHref({
  rubrique,
  categorie,
  famille,
}) {
  const params =
    new URLSearchParams()

  if (rubrique) {
    params.set(
      'rubrique',
      rubrique
    )
  }

  if (categorie) {
    params.set(
      'categorie',
      categorie
    )
  }

  if (famille) {
    params.set(
      'famille',
      famille
    )
  }

  params.set('page', '1')

  return `/shop?${params.toString()}`
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

  const requestIdRef =
    useRef(0)

  const [
    catalogueOpen,
    setCatalogueOpen,
  ] = useState(false)

  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] = useState(false)

  const [
    searchOpen,
    setSearchOpen,
  ] = useState(false)

  const [
    searchValue,
    setSearchValue,
  ] = useState('')

  const [
    selectedRubrique,
    setSelectedRubrique,
  ] = useState(
    PRODUCT_SECTIONS[0]?.value || ''
  )

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState('')

  const [
    catalogueData,
    setCatalogueData,
  ] = useState({
    categories: [],
    families: [],
  })

  const [
    catalogueLoading,
    setCatalogueLoading,
  ] = useState(false)

  const [
    catalogueError,
    setCatalogueError,
  ] = useState('')

  const { count } = useCart()

  const {
    locale,
    setLocale,
    t,
  } = useSiteI18n()

  const selectedSectionFromUrl =
    searchParams.get(
      'rubrique'
    ) || ''

  const activeSection =
    useMemo(() => {
      return (
        PRODUCT_SECTIONS.find(
          section =>
            section.value ===
            selectedRubrique
        ) ||
        PRODUCT_SECTIONS[0] ||
        null
      )
    }, [selectedRubrique])

  function closeAllPanels() {
    setCatalogueOpen(false)
    setMobileMenuOpen(false)
    setSearchOpen(false)
  }

  async function loadCatalogue({
    rubrique,
    categorie = '',
  }) {
    if (!rubrique) {
      setCatalogueData({
        categories: [],
        families: [],
      })

      return
    }

    const currentRequestId =
      requestIdRef.current + 1

    requestIdRef.current =
      currentRequestId

    setCatalogueLoading(true)
    setCatalogueError('')

    try {
      const result =
        await getProductFilters({
          rubrique: [rubrique],

          categorie: categorie
            ? [categorie]
            : [],
        })

      if (
        requestIdRef.current !==
        currentRequestId
      ) {
        return
      }

      setCatalogueData({
        categories:
          Array.isArray(
            result.categories
          )
            ? result.categories
            : [],

        families:
          Array.isArray(
            result.families
          )
            ? result.families
            : [],
      })
    } catch (error) {
      if (
        requestIdRef.current !==
        currentRequestId
      ) {
        return
      }

      console.error(
        'Erreur chargement navigation catalogue :',
        error
      )

      setCatalogueData({
        categories: [],
        families: [],
      })

      setCatalogueError(
        t(
          'nav.catalogueLoadError'
        )
      )
    } finally {
      if (
        requestIdRef.current ===
        currentRequestId
      ) {
        setCatalogueLoading(false)
      }
    }
  }

  function openCatalogue() {
    setCatalogueOpen(true)
    setMobileMenuOpen(false)
    setSearchOpen(false)

    const rubrique =
      selectedSectionFromUrl &&
      PRODUCT_SECTIONS.some(
        section =>
          section.value ===
          selectedSectionFromUrl
      )
        ? selectedSectionFromUrl
        : selectedRubrique ||
          PRODUCT_SECTIONS[0]?.value ||
          ''

    setSelectedRubrique(
      rubrique
    )

    setSelectedCategory('')

    setCatalogueData({
      categories: [],
      families: [],
    })

    loadCatalogue({
      rubrique,
    })
  }

  function toggleCatalogue() {
    if (catalogueOpen) {
      setCatalogueOpen(false)
      return
    }

    openCatalogue()
  }

  function selectRubrique(
    rubrique
  ) {
    setSelectedRubrique(
      rubrique
    )

    setSelectedCategory('')

    setCatalogueData({
      categories: [],
      families: [],
    })

    loadCatalogue({
      rubrique,
    })
  }

  function selectCategory(
    categorie
  ) {
    setSelectedCategory(
      categorie
    )

    setCatalogueData(current => ({
      ...current,
      families: [],
    }))

    loadCatalogue({
      rubrique:
        selectedRubrique,

      categorie,
    })
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
    selectedSectionFromUrl,
  ])

  useEffect(() => {
    const panelIsOpen =
      catalogueOpen ||
      mobileMenuOpen ||
      searchOpen

    if (!panelIsOpen) {
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
    catalogueOpen,
    mobileMenuOpen,
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
          <Link
            href="/"
            className="site-brand"
            onClick={
              closeAllPanels
            }
            aria-label="CasaLuxuryDecor"
          >
            <Image
              src="/icon.png"
              alt="Logo CasaLuxuryDecor"
              width={92}
              height={81}
              priority
              className="site-brand-logo"
            />

            <strong className="site-brand-name">
              CasaLuxuryDecor
            </strong>
          </Link>

          <button
            type="button"
            className={
              catalogueOpen
                ? 'site-catalogue-trigger is-active'
                : 'site-catalogue-trigger'
            }
            onClick={
              toggleCatalogue
            }
            aria-expanded={
              catalogueOpen
            }
            aria-controls="site-catalogue-navigation"
          >
            <MenuIcon />

            <span>
              {t(
                'nav.catalogue'
              )}
            </span>
          </button>

          <div className="site-header-actions">
            <button
              type="button"
              className="site-header-search-trigger"
              onClick={() => {
                setSearchOpen(
                  current =>
                    !current
                )

                setCatalogueOpen(false)
                setMobileMenuOpen(false)
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

            <button
              type="button"
              className={
                mobileMenuOpen
                  ? 'site-mobile-menu-trigger is-active'
                  : 'site-mobile-menu-trigger'
              }
              onClick={() => {
                setMobileMenuOpen(
                  current =>
                    !current
                )

                setCatalogueOpen(false)
                setSearchOpen(false)
              }}
              aria-label={
                mobileMenuOpen
                  ? t(
                      'nav.closeMenu'
                    )
                  : t(
                      'nav.openMenu'
                    )
              }
              aria-expanded={
                mobileMenuOpen
              }
            >
              {mobileMenuOpen ? (
                <CloseIcon />
              ) : (
                <MenuIcon />
              )}
            </button>
          </div>
        </div>
      </header>

      <div
        className={
          catalogueOpen ||
          mobileMenuOpen ||
          searchOpen
            ? 'site-header-backdrop is-visible'
            : 'site-header-backdrop'
        }
        onClick={
          closeAllPanels
        }
        aria-hidden="true"
      />

      <section
        id="site-catalogue-navigation"
        className={
          catalogueOpen
            ? 'site-catalogue-navigation is-open'
            : 'site-catalogue-navigation'
        }
        aria-hidden={
          !catalogueOpen
        }
      >
        <header className="site-catalogue-navigation-header">
          <div>
            <strong>
              {t(
                'nav.catalogue'
              )}
            </strong>

            <span>
              {t(
                'nav.catalogueDescription'
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={
              closeAllPanels
            }
            aria-label={t(
              'nav.closeMenu'
            )}
          >
            <CloseIcon />
          </button>
        </header>

        <div className="site-catalogue-navigation-body">
          <nav
            className="site-catalogue-rubriques"
            aria-label={t(
              'nav.sections'
            )}
          >
            {PRODUCT_SECTIONS.map(
              section => (
                <button
                  key={
                    section.value
                  }
                  type="button"
                  className={
                    selectedRubrique ===
                    section.value
                      ? 'is-active'
                      : ''
                  }
                  onClick={() => {
                    selectRubrique(
                      section.value
                    )
                  }}
                >
                  <span>
                    {t(
                      section.translationKey
                    )}
                  </span>

                  <ChevronRightIcon />
                </button>
              )
            )}
          </nav>

          <div
            className={
              selectedCategory
                ? 'site-catalogue-content has-family-column'
                : 'site-catalogue-content'
            }
          >
            <div className="site-catalogue-column">
              <div className="site-catalogue-column-heading">
                <h2>
                  {activeSection
                    ? t(
                        activeSection.translationKey
                      )
                    : t(
                        'nav.categories'
                      )}
                </h2>

                <Link
                  href={buildShopHref({
                    rubrique:
                      selectedRubrique,
                  })}
                  onClick={
                    closeAllPanels
                  }
                >
                  {t(
                    'nav.viewAll'
                  )}
                </Link>
              </div>

              {catalogueLoading ? (
                <p className="site-catalogue-state">
                  {t(
                    'common.loading'
                  )}
                </p>
              ) : catalogueError ? (
                <p className="site-catalogue-state is-error">
                  {catalogueError}
                </p>
              ) : catalogueData
                  .categories
                  .length === 0 ? (
                <p className="site-catalogue-state">
                  {t(
                    'nav.noCategories'
                  )}
                </p>
              ) : (
                <div className="site-catalogue-links">
                  {catalogueData.categories.map(
                    categorie => (
                      <button
                        key={
                          categorie
                        }
                        type="button"
                        className={
                          selectedCategory ===
                          categorie
                            ? 'is-active'
                            : ''
                        }
                        onClick={() => {
                          selectCategory(
                            categorie
                          )
                        }}
                      >
                        <span>
                          {categorie}
                        </span>

                        <ChevronRightIcon />
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            {selectedCategory && (
              <div className="site-catalogue-column site-catalogue-family-column">
                <div className="site-catalogue-column-heading">
                  <h2>
                    {selectedCategory}
                  </h2>

                  <Link
                    href={buildShopHref({
                      rubrique:
                        selectedRubrique,

                      categorie:
                        selectedCategory,
                    })}
                    onClick={
                      closeAllPanels
                    }
                  >
                    {t(
                      'nav.viewCategory'
                    )}
                  </Link>
                </div>

                {catalogueLoading ? (
                  <p className="site-catalogue-state">
                    {t(
                      'common.loading'
                    )}
                  </p>
                ) : catalogueData
                    .families
                    .length === 0 ? (
                  <p className="site-catalogue-state">
                    {t(
                      'nav.noFamilies'
                    )}
                  </p>
                ) : (
                  <div className="site-catalogue-family-grid">
                    {catalogueData.families.map(
                      famille => (
                        <Link
                          key={
                            famille
                          }
                          href={buildShopHref({
                            rubrique:
                              selectedRubrique,

                            categorie:
                              selectedCategory,

                            famille,
                          })}
                          onClick={
                            closeAllPanels
                          }
                        >
                          {famille}
                        </Link>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <aside
        className={
          mobileMenuOpen
            ? 'site-mobile-navigation is-open'
            : 'site-mobile-navigation'
        }
        aria-hidden={
          !mobileMenuOpen
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
            <CloseIcon />
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

        <nav className="site-mobile-navigation-links">
          <Link
            href="/"
            onClick={
              closeAllPanels
            }
          >
            {t('nav.home')}
          </Link>

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false)
              openCatalogue()
            }}
          >
            <span>
              {t(
                'nav.catalogue'
              )}
            </span>

            <ChevronRightIcon />
          </button>

          <Link
            href="/shop"
            onClick={
              closeAllPanels
            }
          >
            {t('nav.shop')}
          </Link>

          <Link
            href="/contact"
            onClick={
              closeAllPanels
            }
          >
            {t('nav.contact')}
          </Link>

          <Link
            href="/cart"
            onClick={
              closeAllPanels
            }
          >
            {t('nav.cart')}

            {count > 0 && (
              <span>
                {count}
              </span>
            )}
          </Link>
        </nav>
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
            <CloseIcon />
          </button>
        </form>
      </section>
    </>
  )
}