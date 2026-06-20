'use client'

import Link from 'next/link'
import {
  useEffect,
  useState,
} from 'react'
import { useCart } from '../context/CartContext'
import SiteLayout from '../components/SiteLayout'
import { useSiteI18n } from '../i18n/SiteI18nProvider'
import {
  formatPrice,
  getProductBySlug,
} from '../lib/products'

export default function ProductPage({
  slug,
}) {
  const { add } = useCart()
  const { locale, t } = useSiteI18n()

  const [product, setProduct] =
    useState(null)

  const [selectedImage, setSelectedImage] =
    useState('')

  const [quantity, setQuantity] =
    useState(1)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  useEffect(() => {
    let active = true

    async function loadProduct() {
      setLoading(true)
      setError('')

      try {
        const result =
          await getProductBySlug(slug)

        if (!active) {
          return
        }

        setProduct(result)

        if (result) {
          setSelectedImage(
            result.images[0]
          )
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

    loadProduct()

    return () => {
      active = false
    }
  }, [slug])

  if (loading) {
    return (
      <SiteLayout>
        <div className="container page-state">
          {t('common.loading')}
        </div>
      </SiteLayout>
    )
  }

  if (error) {
    return (
      <SiteLayout>
        <div className="container page-state">
          <p>{error}</p>

          <Link
            href="/shop"
            className="primary-button"
          >
            {t('product.back')}
          </Link>
        </div>
      </SiteLayout>
    )
  }

  if (!product) {
    return (
      <SiteLayout>
        <div className="container page-state">
          <h1>
            {t('product.notFound')}
          </h1>

          <p>
            {t(
              'product.notFoundText'
            )}
          </p>

          <Link
            href="/shop"
            className="primary-button"
          >
            {t('product.back')}
          </Link>
        </div>
      </SiteLayout>
    )
  }

  return (
    <SiteLayout>
      <section className="section product-section">
        <div className="container">
          <Link
            href="/shop"
            className="back-link"
          >
            ← {t('product.back')}
          </Link>

          <div className="product-detail">
            <div className="product-gallery">
              <div className="product-main-image">
                <img
                  src={
                    selectedImage ||
                    product.image
                  }
                  alt={product.name}
                />
              </div>

              {product.images.length > 1 && (
                <div className="product-thumbnails">
                  {product.images.map(
                    image => (
                      <button
                        key={image}
                        type="button"
                        className={
                          selectedImage === image
                            ? 'is-active'
                            : ''
                        }
                        onClick={() => {
                          setSelectedImage(
                            image
                          )
                        }}
                      >
                        <img
                          src={image}
                          alt={product.name}
                        />
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            <div className="product-information">
              {product.marque && (
                <p className="section-eyebrow">
                  {product.marque}
                </p>
              )}

              <h1>{product.name}</h1>

              <div className="detail-price">
                {formatPrice(
                  product.price,
                  locale
                )}{' '}
                {t('common.currency')}
              </div>

              <dl className="product-specs">
                {product.reference && (
                  <div>
                    <dt>
                      {t(
                        'product.reference'
                      )}
                    </dt>
                    <dd>
                      {product.reference}
                    </dd>
                  </div>
                )}

                {product.marque && (
                  <div>
                    <dt>
                      {t(
                        'product.brand'
                      )}
                    </dt>
                    <dd>
                      {product.marque}
                    </dd>
                  </div>
                )}

                {product.famille && (
                  <div>
                    <dt>
                      {t(
                        'product.family'
                      )}
                    </dt>
                    <dd>
                      {product.famille}
                    </dd>
                  </div>
                )}

                {product.categorie && (
                  <div>
                    <dt>
                      {t(
                        'product.category'
                      )}
                    </dt>
                    <dd>
                      {product.categorie}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="buy-row">
                <label className="quantity-field">
                  <span>
                    {t(
                      'product.quantity'
                    )}
                  </span>

                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setQuantity(current =>
                          Math.max(
                            1,
                            current - 1
                          )
                        )
                      }}
                    >
                      −
                    </button>

                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={event => {
                        setQuantity(
                          Math.max(
                            1,
                            Number(
                              event.target
                                .value
                            ) || 1
                          )
                        )
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => {
                        setQuantity(
                          current =>
                            current + 1
                        )
                      }}
                    >
                      +
                    </button>
                  </div>
                </label>

                <button
                  type="button"
                  className="primary-button add-cart-button"
                  onClick={() => {
                    add(product, quantity)
                  }}
                >
                  {t('common.addToCart')}
                </button>
              </div>

              {product.description && (
                <div className="product-description">
                  <h2>
                    {t(
                      'product.description'
                    )}
                  </h2>

                  <p>
                    {product.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  )
}