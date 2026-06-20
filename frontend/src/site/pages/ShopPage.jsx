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
import SiteLayout from '../components/SiteLayout'
import { useSiteI18n } from '../i18n/SiteI18nProvider'
import { getProductsPage } from '../lib/products'
import {
  PRODUCT_SECTIONS,
  PRODUCT_SECTION_VALUES,
} from '../constants/productSections'

const PRODUCTS_PER_PAGE = 10

export default function ShopPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useSiteI18n()

  const requestedSection =
    searchParams.get('rubrique') || ''

  const selectedSection =
    PRODUCT_SECTION_VALUES.includes(
      requestedSection
    )
      ? requestedSection
      : ''

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

  const [products, setProducts] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [search, setSearch] =
    useState(urlSearch)
  const [debouncedSearch, setDebouncedSearch] =
    useState(urlSearch)

  const [loading, setLoading] =
    useState(true)
  const [error, setError] =
    useState('')

  const selectedSectionConfig =
    PRODUCT_SECTIONS.find(section => {
      return section.value === selectedSection
    })

  const selectedSectionLabel =
    selectedSectionConfig
      ? t(
          selectedSectionConfig.translationKey
        )
      : ''

  useEffect(() => {
    setSearch(urlSearch)
  }, [urlSearch])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 400)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [search])

  useEffect(() => {
    const nextParams =
      new URLSearchParams(
        searchParams.toString()
      )

    const currentUrlSearch =
      nextParams.get('search') || ''

    if (
      currentUrlSearch === debouncedSearch
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

    router.replace(
      `/shop?${nextParams.toString()}`,
      {
        scroll: false,
      }
    )
  }, [debouncedSearch])

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
            rubrique: selectedSection,
            search: urlSearch,
          })

        if (!active) {
          return
        }

        setProducts(result.items)
        setTotal(result.total)
        setPages(result.pages)

        if (
          result.pages > 0 &&
          currentPage > result.pages
        ) {
          changePage(result.pages)
        }
      } catch (loadError) {
        console.error(loadError)

        if (active) {
          setError(t('common.error'))
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
    currentPage,
    selectedSection,
    urlSearch,
  ])

  const visiblePages = useMemo(() => {
    const start = Math.max(
      currentPage - 2,
      1
    )

    const end = Math.min(
      start + 4,
      pages
    )

    const adjustedStart = Math.max(
      end - 4,
      1
    )

    return Array.from(
      {
        length:
          end - adjustedStart + 1,
      },
      (_, index) =>
        adjustedStart + index
    )
  }, [currentPage, pages])

  function changePage(nextPage) {
    const safePage = Math.min(
      Math.max(nextPage, 1),
      pages
    )

    const nextParams =
      new URLSearchParams(
        searchParams.toString()
      )

    nextParams.set(
      'page',
      String(safePage)
    )

    router.push(
      `/shop?${nextParams.toString()}`
    )

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  return (
    <SiteLayout>
      <section className="page-hero">
        <div className="container">
          <p className="section-eyebrow">
            Rim Cristal
          </p>

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
      </section>

      <section className="section">
        <div className="container">
          <div className="shop-toolbar">
            <label className="search-field">
              <span className="sr-only">
                {t('shop.search')}
              </span>

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
            </label>
          </div>

          <div className="shop-results-heading">
            <strong>
              {total}{' '}
              {t('shop.results')}
            </strong>
          </div>

          {loading && (
            <div className="empty-block">
              {t('common.loading')}
            </div>
          )}

          {error && (
            <div className="error-block">
              <p>{error}</p>

              <button
                type="button"
                onClick={() => {
                  router.refresh()
                }}
              >
                {t('common.retry')}
              </button>
            </div>
          )}

          {!loading &&
            !error &&
            products.length > 0 && (
              <>
                <div className="product-grid">
                  {products.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                    />
                  ))}
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
                      {t('shop.previous')}
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
                      {t('shop.next')}
                    </button>
                  </nav>
                )}

                <p className="pagination-summary">
                  {t('shop.page')}{' '}
                  {currentPage}{' '}
                  {t('shop.of')} {pages}
                </p>
              </>
            )}

          {!loading &&
            !error &&
            products.length === 0 && (
              <div className="empty-block">
                {t('shop.empty')}
              </div>
            )}
        </div>
      </section>
    </SiteLayout>
  )
}