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
import { getProducts } from '../lib/products'

export default function HomePage() {
  const { t } = useSiteI18n()

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadProducts() {
    setLoading(true)
    setError('')

    try {
      const result = await getProducts()
      setProducts(result)
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

  const heroProduct = products[0]

  const categories = useMemo(() => {
    const values = products
      .map(product => {
        return (
          product.categorie ||
          product.famille
        )
      })
      .filter(Boolean)

    return [...new Set(values)].slice(0, 4)
  }, [products])

  const displayedProducts = useMemo(() => {
    const selected = products.filter(
      product =>
        product.isFeatured ||
        product.isNew ||
        product.isBestseller
    )

    return (
      selected.length > 0
        ? selected
        : products
    ).slice(0, 8)
  }, [products])

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

          <div className="hero-visual">
            <img
              src={
                heroProduct?.image ||
                '/images/product-placeholder.svg'
              }
alt={
  heroProduct?.name ||
  t('brand')
}
            />

            {heroProduct && (
              <Link
                href={`/product/${heroProduct.slug}`}
                className="hero-product-card"
              >
                <span>
                  {heroProduct.marque ||
                    heroProduct.categorie}
                </span>

                <strong>
                  {heroProduct.name}
                </strong>
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-heading">
            <div>
              <h2>
                {t('home.categoriesTitle')}
              </h2>

              <p>
                {t(
                  'home.categoriesSubtitle'
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

          <div className="category-grid">
            {categories.length > 0 ? (
              categories.map(
                (category, index) => {
                  const matchingProduct =
                    products.find(product => {
                      return (
                        product.categorie ===
                          category ||
                        product.famille ===
                          category
                      )
                    })

                  return (
                    <Link
                      key={category}
                      href={`/shop?category=${encodeURIComponent(
                        category
                      )}`}
                      className="category-card"
                    >
                      <img
                        src={
                          matchingProduct?.image ||
                          '/images/product-placeholder.svg'
                        }
                        alt={category}
                      />

                      <div className="category-overlay">
                        <span>
                          0{index + 1}
                        </span>

                        <strong>
                          {category}
                        </strong>
                      </div>
                    </Link>
                  )
                }
              )
            ) : (
              <div className="empty-block">
                {loading
                  ? t('common.loading')
                  : t('shop.empty')}
              </div>
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
            displayedProducts.length > 0 && (
              <div className="product-grid">
                {displayedProducts.map(
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