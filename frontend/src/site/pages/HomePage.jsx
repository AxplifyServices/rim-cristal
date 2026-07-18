'use client'

import Link from 'next/link'
import {
  useEffect,
  useState,
} from 'react'

import HomeBrochureCarousel from '../components/HomeBrochureCarousel'
import ProductCard from '../components/ProductCard'
import SiteLayout from '../components/SiteLayout'
import { useSiteI18n } from '../i18n/SiteI18nProvider'
import {
  getProductsPage,
} from '../lib/products'

const BESTSELLERS_LIMIT = 8
const SKELETON_COUNT = 6

function ProductCardSkeleton() {
  return (
    <article
      className="product-card product-card-skeleton"
      aria-hidden="true"
    >
      <div className="product-card-skeleton-image" />

      <div className="product-card-skeleton-body">
        <div className="product-card-skeleton-line is-meta" />
        <div className="product-card-skeleton-line is-title" />
        <div className="product-card-skeleton-line is-title-short" />

        <div className="product-card-skeleton-footer">
          <div className="product-card-skeleton-line is-price" />
          <div className="product-card-skeleton-action" />
        </div>
      </div>
    </article>
  )
}

export default function HomePage() {
  const { t } = useSiteI18n()

  const [
    bestsellers,
    setBestsellers,
  ] = useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  async function loadProducts() {
    setLoading(true)
    setError('')

    try {
      const response =
        await getProductsPage({
          page: 1,

          pageSize:
            BESTSELLERS_LIMIT,

          bestseller: true,
        })

      setBestsellers(
        response.items
      )
    } catch (loadError) {
      console.error(
        loadError
      )

      setError(
        t(
          'common.error'
        )
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  return (
    <SiteLayout>
      <HomeBrochureCarousel />

      <section className="section section-light home-products-section">
        <div className="container">
          <div className="section-heading home-products-heading">
            <div>
              <span className="home-section-kicker">
                {t(
                  'home.featuredKicker'
                )}
              </span>

              <h2>
                {t(
                  'home.featuredTitle'
                )}
              </h2>

              <p>
                {t(
                  'home.featuredSubtitle'
                )}
              </p>
            </div>

            <Link
              href="/shop"
              className="text-link"
            >
              {t(
                'common.viewAll'
              )}
            </Link>
          </div>

          {loading && (
            <div className="product-grid home-product-grid">
              {Array.from({
                length:
                  SKELETON_COUNT,
              }).map(
                (_, index) => (
                  <ProductCardSkeleton
                    key={
                      index
                    }
                  />
                )
              )}
            </div>
          )}

          {error && (
            <div className="error-block">
              <p>{error}</p>

              <button
                type="button"
                onClick={
                  loadProducts
                }
              >
                {t(
                  'common.retry'
                )}
              </button>
            </div>
          )}

          {!loading &&
            !error &&
            bestsellers.length ===
              0 && (
              <div className="empty-block">
                {t(
                  'home.noBestsellers'
                )}
              </div>
            )}

          {!loading &&
            !error &&
            bestsellers.length >
              0 && (
              <div className="product-grid home-product-grid">
                {bestsellers.map(
                  product => (
                    <ProductCard
                      key={
                        product.id
                      }
                      product={
                        product
                      }
                    />
                  )
                )}
              </div>
            )}
        </div>
      </section>
    </SiteLayout>
  )
}