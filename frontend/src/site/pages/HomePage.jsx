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
      console.error(loadError)
      setError(
        t('common.error')
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

      <section className="section section-light">
        <div className="container">
          <div className="section-heading">
            <div>
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
            <div className="empty-block">
              {t(
                'common.loading'
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
              <div className="product-grid">
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