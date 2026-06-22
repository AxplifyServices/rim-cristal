'use client'

import Link from 'next/link'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import ProductCard from '../components/ProductCard'
import SiteLayout from '../components/SiteLayout'
import { useSiteI18n } from '../i18n/SiteI18nProvider'
import { getProductsPage } from '../lib/products'

const HERO_SLIDE_DURATION = 5000
const HERO_PRODUCTS_LIMIT = 8
const BESTSELLERS_LIMIT = 8

export default function HomePage() {
  const { t } = useSiteI18n()

  const [heroProducts, setHeroProducts] =
    useState([])

  const [bestsellers, setBestsellers] =
    useState([])

  const [heroIndex, setHeroIndex] =
    useState(0)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  async function loadProducts() {
    setLoading(true)
    setError('')

    try {
      const [
        heroResponse,
        bestsellerResponse,
      ] = await Promise.all([
        getProductsPage({
          page: 1,
          pageSize: HERO_PRODUCTS_LIMIT,
        }),

        getProductsPage({
          page: 1,
          pageSize: BESTSELLERS_LIMIT,
          bestseller: true,
        }),
      ])

      setHeroProducts(
        heroResponse.items.filter(
          product => Boolean(product.image)
        )
      )

      setBestsellers(
        bestsellerResponse.items
      )

      setHeroIndex(0)
    } catch (loadError) {
      console.error(loadError)
      setError(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    if (heroProducts.length <= 1) {
      return undefined
    }

    const intervalId =
      window.setInterval(() => {
        setHeroIndex(currentIndex => {
          return (
            currentIndex + 1
          ) % heroProducts.length
        })
      }, HERO_SLIDE_DURATION)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [heroProducts.length])

  const currentHeroProduct =
    heroProducts[heroIndex]

  const hasSeveralSlides =
    heroProducts.length > 1

  function showPreviousSlide() {
    if (!hasSeveralSlides) {
      return
    }

    setHeroIndex(currentIndex => {
      return (
        currentIndex -
        1 +
        heroProducts.length
      ) % heroProducts.length
    })
  }

  function showNextSlide() {
    if (!hasSeveralSlides) {
      return
    }

    setHeroIndex(currentIndex => {
      return (
        currentIndex + 1
      ) % heroProducts.length
    })
  }

  const heroImage =
    currentHeroProduct?.image ||
    '/images/product-placeholder.svg'

  const heroAlt =
    currentHeroProduct?.name ||
    t('brand')

  return (
    <SiteLayout>
      <section className="hero-section">
        <div className="container hero-grid">
          <div className="hero-content">
            <p className="section-eyebrow">
              {t('home.eyebrow')}
            </p>

            <h1 className="hero-title">
              {t('home.title')}
            </h1>

            <p className="hero-text">
              {t('home.subtitle')}
            </p>

            <Link
              href="/shop"
              className="primary-button"
            >
              {t('home.heroCta')}
            </Link>
          </div>

          <div
            className="hero-visual hero-carousel"
            aria-live="polite"
          >
            <img
              key={
                currentHeroProduct?.id ||
                'placeholder'
              }
              src={heroImage}
              alt={heroAlt}
              className="hero-carousel-image"
            />

            {currentHeroProduct && (
              <Link
                href={`/product/${currentHeroProduct.slug}`}
                className="hero-product-card"
              >
                <span>
                  {currentHeroProduct.marque ||
                    currentHeroProduct.categorie ||
                    t('brand')}
                </span>

                <strong>
                  {currentHeroProduct.name}
                </strong>
              </Link>
            )}

            {hasSeveralSlides && (
              <>
                <button
                  type="button"
                  className="hero-carousel-button hero-carousel-button-previous"
                  onClick={showPreviousSlide}
                  aria-label={t(
                    'home.previousSlide'
                  )}
                >
                  ‹
                </button>

                <button
                  type="button"
                  className="hero-carousel-button hero-carousel-button-next"
                  onClick={showNextSlide}
                  aria-label={t(
                    'home.nextSlide'
                  )}
                >
                  ›
                </button>

                <div
                  className="hero-carousel-dots"
                  role="group"
                  aria-label={t('brand')}
                >
                  {heroProducts.map(
                    (product, index) => (
                      <button
                        key={product.id}
                        type="button"
                        className={
                          index === heroIndex
                            ? 'hero-carousel-dot is-active'
                            : 'hero-carousel-dot'
                        }
                        onClick={() => {
                          setHeroIndex(index)
                        }}
                        aria-label={t(
                          'home.goToSlide',
                          {
                            number:
                              index + 1,
                          }
                        )}
                        aria-current={
                          index === heroIndex
                            ? 'true'
                            : undefined
                        }
                      />
                    )
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="section section-light">
        <div className="container">
          <div className="section-heading">
            <div>
              <h2>
                {t('home.featuredTitle')}
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
              {t('common.viewAll')}
            </Link>
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
                onClick={loadProducts}
              >
                {t('common.retry')}
              </button>
            </div>
          )}

          {!loading &&
            !error &&
            bestsellers.length === 0 && (
              <div className="empty-block">
                {t(
                  'home.noBestsellers'
                )}
              </div>
            )}

          {!loading &&
            !error &&
            bestsellers.length > 0 && (
              <div className="product-grid">
                {bestsellers.map(
                  product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                    />
                  )
                )}
              </div>
            )}
        </div>
      </section>

      <section className="benefits-section">
        <div className="container benefits-grid">
          <article>
            <span>01</span>

            <h2>
              {t('home.benefit1Title')}
            </h2>

            <p>
              {t('home.benefit1Text')}
            </p>
          </article>

          <article>
            <span>02</span>

            <h2>
              {t('home.benefit2Title')}
            </h2>

            <p>
              {t('home.benefit2Text')}
            </p>
          </article>

          <article>
            <span>03</span>

            <h2>
              {t('home.benefit3Title')}
            </h2>

            <p>
              {t('home.benefit3Text')}
            </p>
          </article>
        </div>
      </section>
    </SiteLayout>
  )
}