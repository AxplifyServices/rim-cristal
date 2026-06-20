'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useSearchParams } from 'next/navigation'
import ProductCard from '../components/ProductCard'
import SiteLayout from '../components/SiteLayout'
import { useSiteI18n } from '../i18n/SiteI18nProvider'
import { getProducts } from '../lib/products'

export default function ShopPage() {
  const searchParams = useSearchParams()
  const { t } = useSiteI18n()

  const initialCategory =
    searchParams.get('category') || ''

  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] =
    useState(initialCategory)

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

  const categories = useMemo(() => {
    const values = products.flatMap(product => {
      return [
        product.categorie,
        product.famille,
      ].filter(Boolean)
    })

    return [...new Set(values)].sort()
  }, [products])

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase()

    return products.filter(product => {
      const matchesCategory =
        !category ||
        product.categorie === category ||
        product.famille === category

      const searchableText = [
        product.name,
        product.reference,
        product.marque,
        product.famille,
        product.categorie,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesSearch =
        !normalizedSearch ||
        searchableText.includes(
          normalizedSearch
        )

      return (
        matchesCategory &&
        matchesSearch
      )
    })
  }, [products, search, category])

  return (
    <SiteLayout>
      <section className="page-hero">
        <div className="container">
          <p className="section-eyebrow">
            Lux Lumina
          </p>

          <h1>{t('shop.title')}</h1>

          <p>{t('shop.subtitle')}</p>
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

            <select
              value={category}
              onChange={event => {
                setCategory(
                  event.target.value
                )
              }}
              aria-label="Catégorie"
            >
              <option value="">
                {t('shop.all')}
              </option>

              {categories.map(item => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="shop-results-heading">
            <strong>
              {filteredProducts.length}{' '}
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
                onClick={loadProducts}
              >
                {t('common.retry')}
              </button>
            </div>
          )}

          {!loading &&
            !error &&
            filteredProducts.length > 0 && (
              <div className="product-grid">
                {filteredProducts.map(
                  product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                    />
                  )
                )}
              </div>
            )}

          {!loading &&
            !error &&
            filteredProducts.length === 0 && (
              <div className="empty-block">
                {t('shop.empty')}
              </div>
            )}
        </div>
      </section>
    </SiteLayout>
  )
}