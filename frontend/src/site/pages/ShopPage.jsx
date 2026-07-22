'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  useRouter,
  useSearchParams,
} from 'next/navigation'
import ProductCard from '../components/ProductCard'
import ShopFilters from '../components/ShopFilters'
import SiteLayout from '../components/SiteLayout'
import { useSiteI18n } from '../i18n/SiteI18nProvider'
import {
  getProductFilters,
  getProductsPage,
} from '../lib/products'
import {
  PRODUCT_SECTIONS,
  PRODUCT_SECTION_VALUES,
} from '../constants/productSections'

const PRODUCTS_PER_PAGE = 10
const PRICE_DEBOUNCE_DELAY = 300
const SEARCH_DEBOUNCE_DELAY = 400

export default function ShopPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useSiteI18n()

  const searchParamsString =
    searchParams.toString()

  const selectedRubriques =
    searchParams
      .getAll('rubrique')
      .filter(value =>
        PRODUCT_SECTION_VALUES.includes(
          value
        )
      )

  const selectedCategories =
    searchParams
      .getAll('categorie')
      .filter(Boolean)

  const selectedFamilies =
    searchParams
      .getAll('famille')
      .filter(Boolean)

  const requestedMinPrice =
    searchParams.get('prix_min')

  const requestedMaxPrice =
    searchParams.get('prix_max')

  const requestedPage = Number(
    searchParams.get('page') || 1
  )

  const currentPage =
    Number.isInteger(requestedPage) &&
    requestedPage > 0
      ? requestedPage
      : 1

  const urlSearch =
    searchParams.get('search') || ''

  const [products, setProducts] =
    useState([])

  const [total, setTotal] =
    useState(0)

  const [pages, setPages] =
    useState(1)

  const [search, setSearch] =
    useState(urlSearch)

  const [
    debouncedSearch,
    setDebouncedSearch,
  ] = useState(urlSearch)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [reloadKey, setReloadKey] =
    useState(0)

  const [filters, setFilters] =
    useState({
      rubriques:
        PRODUCT_SECTION_VALUES,
      categories: [],
      families: [],
      price: {
        min: 0,
        max: 0,
      },
    })

  const [
    filtersLoading,
    setFiltersLoading,
  ] = useState(true)

  const [filtersOpen, setFiltersOpen] =
    useState(false)

  const [priceMin, setPriceMin] =
    useState(0)

  const [priceMax, setPriceMax] =
    useState(0)

  const [
    pendingPrice,
    setPendingPrice,
  ] = useState(null)

  const selectedSectionConfig =
    selectedRubriques.length === 1
      ? PRODUCT_SECTIONS.find(
          section =>
            section.value ===
            selectedRubriques[0]
        )
      : null

  const selectedSectionLabel =
    selectedSectionConfig
      ? t(
          selectedSectionConfig
            .translationKey
        )
      : ''

  useEffect(() => {
    setSearch(urlSearch)
  }, [urlSearch])

  useEffect(() => {
    const timeout =
      window.setTimeout(() => {
        setDebouncedSearch(
          search.trim()
        )
      }, SEARCH_DEBOUNCE_DELAY)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [search])

  useEffect(() => {
    const nextParams =
      new URLSearchParams(
        searchParamsString
      )

    const currentUrlSearch =
      nextParams.get('search') || ''

    if (
      currentUrlSearch ===
      debouncedSearch
    ) {
      return
    }

    if (debouncedSearch) {
      nextParams.set(
        'search',
        debouncedSearch
      )
    } else {
      nextParams.delete('search')
    }

    nextParams.set('page', '1')

    const nextQuery =
      nextParams.toString()

    router.replace(
      nextQuery
        ? `/shop?${nextQuery}`
        : '/shop',
      {
        scroll: false,
      }
    )
  }, [
    debouncedSearch,
    router,
    searchParamsString,
  ])

  useEffect(() => {
    let active = true

    async function loadFilters() {
      setFiltersLoading(true)

      try {
        const result =
          await getProductFilters({
            rubrique:
              selectedRubriques,
            categorie:
              selectedCategories,
          })

        if (!active) {
          return
        }

        const defaultMin =
          Number(result.price.min || 0)

        const defaultMax =
          Number(result.price.max || 0)

        const parsedMin =
          requestedMinPrice !== null
            ? Number(
                requestedMinPrice
              )
            : defaultMin

        const parsedMax =
          requestedMaxPrice !== null
            ? Number(
                requestedMaxPrice
              )
            : defaultMax

        const nextMin =
          Number.isFinite(parsedMin)
            ? Math.max(
                defaultMin,
                Math.min(
                  parsedMin,
                  defaultMax
                )
              )
            : defaultMin

        const nextMax =
          Number.isFinite(parsedMax)
            ? Math.min(
                defaultMax,
                Math.max(
                  parsedMax,
                  defaultMin
                )
              )
            : defaultMax

        setFilters({
          rubriques:
            result.rubriques,
          categories:
            result.categories,
          families:
            result.families,
          price: {
            min: defaultMin,
            max: defaultMax,
          },
        })

        setPriceMin(
          Math.min(
            nextMin,
            nextMax
          )
        )

        setPriceMax(
          Math.max(
            nextMin,
            nextMax
          )
        )
      } catch (filterError) {
        console.error(
          'Erreur chargement filtres :',
          filterError
        )
      } finally {
        if (active) {
          setFiltersLoading(false)
        }
      }
    }

    loadFilters()

    return () => {
      active = false
    }
  }, [
    reloadKey,
    searchParamsString,
  ])

  useEffect(() => {
    let active = true

    async function loadProducts() {
      setLoading(true)
      setError('')

      try {
        const result =
          await getProductsPage({
            page: currentPage,
            pageSize:
              PRODUCTS_PER_PAGE,
            rubrique:
              selectedRubriques,
            categorie:
              selectedCategories,
            famille:
              selectedFamilies,
            minPrice:
              requestedMinPrice ??
              undefined,
            maxPrice:
              requestedMaxPrice ??
              undefined,
            search: urlSearch,
          })

        if (!active) {
          return
        }

        const resultPages =
          Math.max(
            Number(result.pages) || 1,
            1
          )

        setProducts(
          Array.isArray(result.items)
            ? result.items
            : []
        )

        setTotal(
          Number(result.total) || 0
        )

        setPages(resultPages)

        if (
          currentPage >
          resultPages
        ) {
          const nextParams =
            new URLSearchParams(
              searchParamsString
            )

          nextParams.set(
            'page',
            String(resultPages)
          )

          router.replace(
            `/shop?${nextParams.toString()}`,
            {
              scroll: false,
            }
          )
        }
      } catch (loadError) {
        console.error(
          'Erreur chargement produits :',
          loadError
        )

        if (active) {
          setProducts([])
          setTotal(0)
          setPages(1)
          setError(
            t('common.error')
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadProducts()

    return () => {
      active = false
    }
  }, [
    reloadKey,
    searchParamsString,
    router,
    t,
  ])

  useEffect(() => {
    if (!pendingPrice) {
      return
    }

    const timeout =
      window.setTimeout(() => {
        const nextParams =
          new URLSearchParams(
            searchParamsString
          )

        if (
          pendingPrice.min <=
          filters.price.min
        ) {
          nextParams.delete(
            'prix_min'
          )
        } else {
          nextParams.set(
            'prix_min',
            String(
              pendingPrice.min
            )
          )
        }

        if (
          pendingPrice.max >=
          filters.price.max
        ) {
          nextParams.delete(
            'prix_max'
          )
        } else {
          nextParams.set(
            'prix_max',
            String(
              pendingPrice.max
            )
          )
        }

        nextParams.set(
          'page',
          '1'
        )

        const nextQuery =
          nextParams.toString()

        setPendingPrice(null)

        router.replace(
          nextQuery
            ? `/shop?${nextQuery}`
            : '/shop',
          {
            scroll: false,
          }
        )
      }, PRICE_DEBOUNCE_DELAY)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [
    pendingPrice,
    filters.price.min,
    filters.price.max,
    router,
    searchParamsString,
  ])

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setFiltersOpen(false)
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

  useEffect(() => {
    document.body.style.overflow =
      filtersOpen ? 'hidden' : ''

    return () => {
      document.body.style.overflow =
        ''
    }
  }, [filtersOpen])

  useEffect(() => {
    function handleResize() {
      if (
        window.innerWidth > 760
      ) {
        setFiltersOpen(false)
      }
    }

    window.addEventListener(
      'resize',
      handleResize
    )

    return () => {
      window.removeEventListener(
        'resize',
        handleResize
      )
    }
  }, [])

  const visiblePages =
    useMemo(() => {
      const start = Math.max(
        currentPage - 2,
        1
      )

      const end = Math.min(
        start + 4,
        pages
      )

      const adjustedStart =
        Math.max(
          end - 4,
          1
        )

      return Array.from(
        {
          length:
            end -
            adjustedStart +
            1,
        },
        (_, index) =>
          adjustedStart + index
      )
    }, [currentPage, pages])

  function navigateWithParams(
    params,
    options = {}
  ) {
    const query =
      params.toString()

    const url = query
      ? `/shop?${query}`
      : '/shop'

    const method =
      options.replace
        ? router.replace
        : router.push

    method(url, {
      scroll:
        options.scroll ?? false,
    })
  }

  function replaceFilterValues(
    key,
    values,
    keysToClear = []
  ) {
    setPendingPrice(null)

    const nextParams =
      new URLSearchParams(
        searchParamsString
      )

    nextParams.delete(key)

    values.forEach(value => {
      nextParams.append(
        key,
        value
      )
    })

    keysToClear.forEach(
      keyToClear => {
        nextParams.delete(
          keyToClear
        )
      }
    )

    nextParams.set('page', '1')

    navigateWithParams(
      nextParams
    )
  }

  function toggleValue(
    key,
    currentValues,
    value,
    keysToClear = []
  ) {
    const nextValues =
      currentValues.includes(value)
        ? currentValues.filter(
            currentValue =>
              currentValue !== value
          )
        : [
            ...currentValues,
            value,
          ]

    replaceFilterValues(
      key,
      nextValues,
      keysToClear
    )
  }

  function handlePriceChange(
    nextMin,
    nextMax
  ) {
    const parsedMin =
      Number(nextMin)

    const parsedMax =
      Number(nextMax)

    if (
      !Number.isFinite(parsedMin) ||
      !Number.isFinite(parsedMax)
    ) {
      return
    }

    const safeMin =
      Math.min(
        parsedMin,
        parsedMax
      )

    const safeMax =
      Math.max(
        parsedMin,
        parsedMax
      )

    setPriceMin(safeMin)
    setPriceMax(safeMax)

    setPendingPrice({
      min: safeMin,
      max: safeMax,
    })
  }

  function resetFilters() {
    setPendingPrice(null)

    const nextParams =
      new URLSearchParams()

    if (urlSearch) {
      nextParams.set(
        'search',
        urlSearch
      )
    }

    nextParams.set(
      'page',
      '1'
    )

    navigateWithParams(
      nextParams
    )
  }

  function retryLoading() {
    setReloadKey(
      currentValue =>
        currentValue + 1
    )
  }

  function changePage(nextPage) {
    const safePage =
      Math.min(
        Math.max(
          Number(nextPage) || 1,
          1
        ),
        Math.max(pages, 1)
      )

    const nextParams =
      new URLSearchParams(
        searchParamsString
      )

    nextParams.set(
      'page',
      String(safePage)
    )

    navigateWithParams(
      nextParams,
      {
        scroll: true,
      }
    )
  }

  const filtersProps = {
    t,
    rubriques:
      filters.rubriques,
    categories:
      filters.categories,
    families:
      filters.families,
    selectedRubriques,
    selectedCategories,
    selectedFamilies,
    priceBounds:
      filters.price,
    currentMinPrice:
      priceMin,
    currentMaxPrice:
      priceMax,

    onToggleRubrique: value => {
      toggleValue(
        'rubrique',
        selectedRubriques,
        value,
        [
          'categorie',
          'famille',
        ]
      )
    },

    onToggleCategory: value => {
      toggleValue(
        'categorie',
        selectedCategories,
        value,
        ['famille']
      )
    },

    onToggleFamily: value => {
      toggleValue(
        'famille',
        selectedFamilies,
        value
      )
    },

    onPriceChange:
      handlePriceChange,

    onReset:
      resetFilters,
  }

return (
  <SiteLayout>
    <section className="shop-hero">
      <div className="container">
        <div className="shop-hero-inner">
          <div className="shop-hero-copy">
            <span className="shop-hero-eyebrow">
              Casa Luxury Decor
            </span>

            <h1>
              {selectedSectionLabel ||
                t('shop.title')}
            </h1>

            <p>
              {selectedSectionLabel
                ? t(
                    'shop.sectionSubtitle',
                    {
                      section:
                        selectedSectionLabel,
                    }
                  )
                : t('shop.subtitle')}
            </p>
          </div>

          <div
            className="shop-hero-decoration"
            aria-hidden="true"
          >
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    </section>

    <section className="section shop-section">
      <div className="container">
        <div className="shop-toolbar">
          <label className="shop-search-field">
            <span className="sr-only">
              {t('shop.search')}
            </span>

            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                cx="11"
                cy="11"
                r="7"
              />

              <path d="m20 20-4.2-4.2" />
            </svg>

            <input
              type="search"
              value={search}
              onChange={event => {
                setSearch(
                  event.target.value
                )
              }}
              placeholder={t(
                'shop.search'
              )}
            />

            {search && (
              <button
                type="button"
                className="shop-search-clear"
                onClick={() => {
                  setSearch('')
                }}
                aria-label={t(
                  'shop.search'
                )}
              >
                ×
              </button>
            )}
          </label>

          <div className="shop-toolbar-actions">
            <div
              className="shop-results-count"
              aria-live="polite"
            >
              <span>
                {total}
              </span>

              <small>
                {t('shop.results')}
              </small>
            </div>

            <button
              type="button"
              className="mobile-filter-button"
              disabled={
                filtersLoading
              }
              aria-busy={
                filtersLoading
              }
              aria-expanded={
                filtersOpen
              }
              aria-controls="mobile-shop-filters"
              onClick={() => {
                setFiltersOpen(true)
              }}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M4 6h16" />
                <path d="M7 12h10" />
                <path d="M10 18h4" />
              </svg>

              <span>
                {t(
                  'shop.filters.button'
                )}
              </span>
            </button>
          </div>
        </div>

        <div className="shop-layout">
          <aside className="desktop-shop-filters">
            {!filtersLoading ? (
              <ShopFilters
                {...filtersProps}
              />
            ) : (
              <div className="shop-filter-skeleton">
                <span />
                <span />
                <span />
                <span />
              </div>
            )}
          </aside>

          <main className="shop-products-column">
            {loading && (
              <div className="shop-products-loading">
                {Array.from(
                  {
                    length: 6,
                  },
                  (_, index) => (
                    <div
                      key={index}
                      className="shop-card-skeleton"
                    >
                      <span />
                      <span />
                      <span />
                    </div>
                  )
                )}
              </div>
            )}

            {!loading && error && (
              <div className="shop-state-card">
                <div className="shop-state-icon">
                  !
                </div>

                <h2>
                  {t('common.error')}
                </h2>

                <p>
                  {error}
                </p>

                <button
                  type="button"
                  onClick={retryLoading}
                >
                  {t('common.retry')}
                </button>
              </div>
            )}

            {!loading &&
              !error &&
              products.length > 0 && (
                <>
                  <div className="product-grid shop-product-grid">
                    {products.map(
                      product => (
                        <ProductCard
                          key={product.id}
                          product={product}
                        />
                      )
                    )}
                  </div>

                  {pages > 1 && (
                    <nav
                      className="pagination"
                      aria-label="Pagination"
                    >
                      <button
                        type="button"
                        className="pagination-direction"
                        disabled={
                          currentPage === 1
                        }
                        onClick={() => {
                          changePage(
                            currentPage - 1
                          )
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="m15 18-6-6 6-6" />
                        </svg>

                        <span>
                          {t(
                            'shop.previous'
                          )}
                        </span>
                      </button>

                      <div className="pagination-pages">
                        {visiblePages.map(
                          pageNumber => (
                            <button
                              key={pageNumber}
                              type="button"
                              className={
                                pageNumber ===
                                currentPage
                                  ? 'pagination-page is-active'
                                  : 'pagination-page'
                              }
                              aria-current={
                                pageNumber ===
                                currentPage
                                  ? 'page'
                                  : undefined
                              }
                              onClick={() => {
                                changePage(
                                  pageNumber
                                )
                              }}
                            >
                              {pageNumber}
                            </button>
                          )
                        )}
                      </div>

                      <button
                        type="button"
                        className="pagination-direction"
                        disabled={
                          currentPage ===
                          pages
                        }
                        onClick={() => {
                          changePage(
                            currentPage + 1
                          )
                        }}
                      >
                        <span>
                          {t(
                            'shop.next'
                          )}
                        </span>

                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </button>
                    </nav>
                  )}

                  <p className="pagination-summary">
                    {t('shop.page')}{' '}
                    {currentPage}{' '}
                    {t('shop.of')}{' '}
                    {pages}
                  </p>
                </>
              )}

            {!loading &&
              !error &&
              products.length === 0 && (
                <div className="shop-state-card">
                  <div className="shop-state-icon">
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        cx="11"
                        cy="11"
                        r="7"
                      />

                      <path d="m20 20-4.2-4.2" />
                    </svg>
                  </div>

                  <h2>
                    {t('shop.empty')}
                  </h2>

                  <button
                    type="button"
                    onClick={resetFilters}
                  >
                    {t(
                      'shop.filters.reset'
                    )}
                  </button>
                </div>
              )}
          </main>
        </div>

        {filtersOpen && (
          <>
            <button
              type="button"
              className="filter-drawer-backdrop"
              aria-label={t(
                'shop.filters.close'
              )}
              onClick={() => {
                setFiltersOpen(false)
              }}
            />

            <aside
              id="mobile-shop-filters"
              className="mobile-shop-filters is-open"
              aria-modal="true"
              role="dialog"
              aria-label={t(
                'shop.filters.title'
              )}
            >
              <ShopFilters
                {...filtersProps}
                mobile
                onReset={() => {
                  resetFilters()
                  setFiltersOpen(false)
                }}
                onClose={() => {
                  setFiltersOpen(false)
                }}
              />
            </aside>
          </>
        )}
      </div>
    </section>
  </SiteLayout>
)
}