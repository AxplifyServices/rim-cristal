'use client'

import Link from 'next/link'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import ProductCard from '../components/ProductCard'
import SiteLayout from '../components/SiteLayout'
import {
  useFavorites,
} from '../context/FavoritesContext'
import {
  useSiteI18n,
} from '../i18n/SiteI18nProvider'
import {
  getProductById,
} from '../lib/products'

function EmptyHeartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" />
    </svg>
  )
}

export default function FavoritesPage() {
  const {
    favoriteProductIds,
    isReady,
    clearFavorites,
  } = useFavorites()

  const { t } =
    useSiteI18n()

  const [
    products,
    setProducts,
  ] = useState([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')

  const [
    reloadKey,
    setReloadKey,
  ] = useState(0)

  const favoriteIdsKey =
    useMemo(() => {
      return favoriteProductIds
        .join(',')
    }, [favoriteProductIds])

  useEffect(() => {
    if (!isReady) {
      return
    }

    let active = true

    async function loadFavorites() {
      setLoading(true)
      setError('')

      if (
        favoriteProductIds.length ===
        0
      ) {
        setProducts([])
        setLoading(false)
        return
      }

      try {
        const results =
          await Promise.allSettled(
            favoriteProductIds.map(
              productId =>
                getProductById(
                  productId
                )
            )
          )

        if (!active) {
          return
        }

        const loadedProducts =
          results
            .filter(
              result =>
                result.status ===
                  'fulfilled' &&
                result.value
            )
            .map(
              result =>
                result.value
            )

        setProducts(
          loadedProducts
        )

        const failedRequests =
          results.some(
            result =>
              result.status ===
              'rejected'
          )

        if (failedRequests) {
          setError(
            t(
              'favorites.partialLoadError'
            )
          )
        }
      } catch (loadError) {
        console.error(
          'Erreur chargement favoris :',
          loadError
        )

        if (active) {
          setProducts([])

          setError(
            t(
              'favorites.loadError'
            )
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadFavorites()

    return () => {
      active = false
    }
  }, [
    favoriteIdsKey,
    isReady,
    reloadKey,
    t,
  ])

  const showLoading =
    !isReady || loading

  return (
    <SiteLayout>
      <section className="favorites-hero">
        <div className="container">
          <div className="favorites-hero-inner">
            <div>
              <span className="favorites-eyebrow">
                {t(
                  'favorites.eyebrow'
                )}
              </span>

              <h1>
                {t(
                  'favorites.title'
                )}
              </h1>

              <p>
                {t(
                  'favorites.subtitle'
                )}
              </p>
            </div>

            {!showLoading &&
              products.length > 0 && (
                <div className="favorites-summary">
                  <strong>
                    {
                      products.length
                    }
                  </strong>

                  <span>
                    {t(
                      products.length >
                        1
                        ? 'favorites.products'
                        : 'favorites.product'
                    )}
                  </span>
                </div>
              )}
          </div>
        </div>
      </section>

      <section className="section favorites-section">
        <div className="container">
          {showLoading ? (
            <div
              className="favorites-state"
              aria-live="polite"
              aria-busy="true"
            >
              <span className="favorites-loader" />

              <p>
                {t(
                  'favorites.loading'
                )}
              </p>
            </div>
          ) : error &&
            products.length === 0 ? (
            <div
              className="favorites-state favorites-error-state"
              role="alert"
            >
              <h2>
                {t(
                  'favorites.errorTitle'
                )}
              </h2>

              <p>{error}</p>

              <button
                type="button"
                className="button button-primary"
                onClick={() => {
                  setReloadKey(
                    current =>
                      current + 1
                  )
                }}
              >
                {t(
                  'common.retry'
                )}
              </button>
            </div>
          ) : products.length ===
            0 ? (
            <div className="favorites-empty">
              <div className="favorites-empty-icon">
                <EmptyHeartIcon />
              </div>

              <span className="favorites-eyebrow">
                {t(
                  'favorites.emptyEyebrow'
                )}
              </span>

              <h2>
                {t(
                  'favorites.emptyTitle'
                )}
              </h2>

              <p>
                {t(
                  'favorites.emptyDescription'
                )}
              </p>

              <Link
                href="/shop"
                className="button button-primary"
              >
                {t(
                  'favorites.discoverShop'
                )}
              </Link>
            </div>
          ) : (
            <>
              <div className="favorites-toolbar">
                <div>
                  <h2>
                    {t(
                      'favorites.selectionTitle'
                    )}
                  </h2>

                  <p>
                    {t(
                      'favorites.selectionDescription'
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  className="favorites-clear-button"
                  onClick={
                    clearFavorites
                  }
                >
                  {t(
                    'favorites.clear'
                  )}
                </button>
              </div>

              {error && (
                <p
                  className="favorites-warning"
                  role="status"
                >
                  {error}
                </p>
              )}

<div className="product-grid home-product-grid favorites-product-grid">
  {products.map(
    (
      product,
      index
    ) => (
      <ProductCard
        key={product.id}
        product={product}
        imagePriority={index < 3}
      />
    )
  )}
</div>
            </>
          )}
        </div>
      </section>
    </SiteLayout>
  )
}