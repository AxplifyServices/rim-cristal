'use client'

import {
  useEffect,
  useRef,
  useState,
} from 'react'

import Link from 'next/link'

import {
  useSiteI18n,
} from '../i18n/SiteI18nProvider'
import {
  getProductsPage,
} from '../lib/products'
import ProductCard from './ProductCard'

const PRODUCTS_PER_PAGE = 6

function ChevronLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M15 18 9 12l6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m9 18 6-6-6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function HomePaginatedProducts({
  initialResult,
  initialLoadFailed = false,
  kicker,
  title,
  subtitle,
  emptyMessage,
  queryOptions = {},
  sectionId,
  viewAllHref = '/shop',
  prioritizeFirstImages = false,
}) {
  const { t } =
    useSiteI18n()

  const initialItems =
    Array.isArray(
      initialResult?.items
    )
      ? initialResult.items
      : []

  const [products, setProducts] =
    useState(initialItems)

  const [
    currentPage,
    setCurrentPage,
  ] = useState(
    Math.max(
      Number(
        initialResult?.page
      ) || 1,
      1
    )
  )

  const [pages, setPages] =
    useState(
      Math.max(
        Number(
          initialResult?.pages
        ) || 1,
        1
      )
    )

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState(
      initialLoadFailed
    )

  const requestIdRef =
    useRef(0)

  useEffect(() => {
    setProducts(
      Array.isArray(
        initialResult?.items
      )
        ? initialResult.items
        : []
    )

    setCurrentPage(
      Math.max(
        Number(
          initialResult?.page
        ) || 1,
        1
      )
    )

    setPages(
      Math.max(
        Number(
          initialResult?.pages
        ) || 1,
        1
      )
    )

    setError(
      initialLoadFailed
    )
  }, [
    initialResult,
    initialLoadFailed,
  ])

  async function loadPage(
    requestedPage
  ) {
    if (loading) {
      return
    }

    /*
     * Navigation circulaire :
     * - avant la page 1 : dernière page ;
     * - après la dernière page : page 1.
     */
    let targetPage =
      Number(requestedPage) || 1

    if (targetPage < 1) {
      targetPage = pages
    }

    if (targetPage > pages) {
      targetPage = 1
    }

    /*
     * Une section ne contenant qu'une
     * page n'a pas besoin d'être rechargée.
     */
    if (
      pages <= 1 ||
      (
        targetPage ===
          currentPage &&
        !error
      )
    ) {
      return
    }

    const requestId =
      requestIdRef.current +
      1

    requestIdRef.current =
      requestId

    setLoading(true)
    setError(false)

    try {
      const result =
        await getProductsPage({
          ...queryOptions,
          page: targetPage,
          pageSize:
            PRODUCTS_PER_PAGE,
        })

      if (
        requestIdRef.current !==
        requestId
      ) {
        return
      }

      const nextPages =
        Math.max(
          Number(
            result?.pages
          ) || 1,
          1
        )

      let nextPage =
        Number(
          result?.page
        ) || targetPage

      if (nextPage < 1) {
        nextPage = 1
      }

      if (
        nextPage >
        nextPages
      ) {
        nextPage =
          nextPages
      }

      setProducts(
        Array.isArray(
          result?.items
        )
          ? result.items
          : []
      )

      setCurrentPage(
        nextPage
      )

      setPages(
        nextPages
      )
    } catch (loadError) {
      if (
        requestIdRef.current !==
        requestId
      ) {
        return
      }

      console.error(
        `Erreur de chargement de la section ${sectionId} :`,
        loadError
      )

      setError(true)
    } finally {
      if (
        requestIdRef.current ===
        requestId
      ) {
        setLoading(false)
      }
    }
  }

  function showPreviousPage() {
    loadPage(
      currentPage - 1
    )
  }

  function showNextPage() {
    loadPage(
      currentPage + 1
    )
  }

  return (
    <section
      id={sectionId}
      className="section section-light home-products-section"
      aria-labelledby={`${sectionId}-title`}
      aria-busy={loading}
    >
      <div className="container">
        <div className="section-heading home-products-heading">
          <div>
            <span className="home-section-kicker">
              {kicker}
            </span>

            <h2
              id={`${sectionId}-title`}
            >
              {title}
            </h2>

            <p>
              {subtitle}
            </p>
          </div>

          <Link
            href={viewAllHref}
            className="text-link"
          >
            {t(
              'common.viewAll'
            )}
          </Link>
        </div>

        {error && (
          <div
            className="error-block"
            role="alert"
          >
            <p>
              {t(
                'common.error'
              )}
            </p>

            <button
              type="button"
              className="primary-button"
              disabled={loading}
              onClick={() => {
                loadPage(
                  currentPage
                )
              }}
            >
              {loading
                ? t(
                    'common.loading'
                  )
                : t(
                    'common.retry'
                  )}
            </button>
          </div>
        )}

        {!error &&
          products.length ===
            0 && (
            <div className="empty-block">
              {emptyMessage}
            </div>
          )}

        {!error &&
          products.length >
            0 && (
            <div className="home-products-carousel">
              {pages > 1 && (
                <button
                  type="button"
                  className="home-products-arrow home-products-arrow-previous"
                  aria-label={t(
                    'shop.previous'
                  )}
                  disabled={loading}
                  onClick={
                    showPreviousPage
                  }
                >
                  <ChevronLeftIcon />
                </button>
              )}

              <div
                className={
                  loading
                    ? 'product-grid home-product-grid home-product-grid-loading'
                    : 'product-grid home-product-grid'
                }
              >
                {products.map(
                  (
                    product,
                    index
                  ) => (
                    <ProductCard
                      key={
                        product.id
                      }
                      product={
                        product
                      }
imagePriority={
  prioritizeFirstImages &&
  currentPage === 1 &&
  index < 2
}
                    />
                  )
                )}
              </div>

              {pages > 1 && (
                <button
                  type="button"
                  className="home-products-arrow home-products-arrow-next"
                  aria-label={t(
                    'shop.next'
                  )}
                  disabled={loading}
                  onClick={
                    showNextPage
                  }
                >
                  <ChevronRightIcon />
                </button>
              )}

              <span
                className="home-products-live-region"
                aria-live="polite"
              >
                {loading
                  ? t(
                      'common.loading'
                    )
                  : ''}
              </span>
            </div>
          )}
      </div>
    </section>
  )
}