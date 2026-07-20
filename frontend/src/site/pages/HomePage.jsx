'use client'

import Link from 'next/link'

import HomeBrochureCarousel from '../components/HomeBrochureCarousel'
import ProductCard from '../components/ProductCard'
import SiteLayout from '../components/SiteLayout'
import {
  useSiteI18n,
} from '../i18n/SiteI18nProvider'

export default function HomePage({
  initialBrochures = [],
  initialBestsellers = [],
  brochuresLoadFailed = false,
  productsLoadFailed = false,
}) {
  const { t } =
    useSiteI18n()

  const bestsellers =
    Array.isArray(
      initialBestsellers
    )
      ? initialBestsellers
      : []

  return (
    <SiteLayout>
      <HomeBrochureCarousel
        initialBrochures={
          initialBrochures
        }
        initialLoadFailed={
          brochuresLoadFailed
        }
      />

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

          {productsLoadFailed && (
            <div
              className="error-block"
              role="alert"
            >
              <p>
                {t(
                  'common.error'
                )}
              </p>

              <Link
                href="/shop"
                className="primary-button"
              >
                {t(
                  'common.viewAll'
                )}
              </Link>
            </div>
          )}

          {!productsLoadFailed &&
            bestsellers.length ===
              0 && (
              <div className="empty-block">
                {t(
                  'home.noBestsellers'
                )}
              </div>
            )}

          {!productsLoadFailed &&
            bestsellers.length >
              0 && (
              <div className="product-grid home-product-grid">
                {bestsellers.map(
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
                        index < 4
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