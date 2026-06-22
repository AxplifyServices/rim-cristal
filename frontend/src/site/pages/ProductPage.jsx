'use client'

import Link from 'next/link'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useCart } from '../context/CartContext'
import SiteLayout from '../components/SiteLayout'
import { useSiteI18n } from '../i18n/SiteI18nProvider'
import {
  formatPrice,
  getProductBySlug,
} from '../lib/products'

function formatDimension(value) {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    return ''
  }

  return new Intl.NumberFormat(
    'fr-MA',
    {
      maximumFractionDigits: 2,
    }
  ).format(number)
}

export default function ProductPage({
  slug,
}) {
  const { add } = useCart()
  const { locale, t } =
    useSiteI18n()

  const [product, setProduct] =
    useState(null)

  const [
    selectedImage,
    setSelectedImage,
  ] = useState('')

  const [
    selectedColor,
    setSelectedColor,
  ] = useState('')

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
          await getProductBySlug(
            slug
          )

        if (!active) {
          return
        }

        setProduct(result)

        if (result) {
          setSelectedImage(
            result.images[0] ||
              result.image
          )

          setSelectedColor(
            result.hasColorVariants &&
            result.colors.length > 0
              ? result.colors[0]
              : ''
          )

          setQuantity(1)
        }
      } catch (loadError) {
        console.error(
          loadError
        )

        if (active) {
          setError(
            t('common.error')
          )
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

  const formattedDimensions =
    useMemo(() => {
      if (!product) {
        return ''
      }

      const dimensions = [
        product.widthCm,
        product.depthCm,
        product.heightCm,
      ]
        .filter(value => {
          return (
            value !== null &&
            value !== undefined &&
            Number.isFinite(
              Number(value)
            )
          )
        })
        .map(formatDimension)
        .filter(Boolean)

      return dimensions.length > 0
        ? `${dimensions.join(
            ' × '
          )} cm`
        : ''
    }, [product])

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
            {t(
              'product.notFound'
            )}
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

  const colorChoiceRequired =
    product.hasColorVariants &&
    product.colors.length > 0

  const canAddToCart =
    product.stock > 0 &&
    (!colorChoiceRequired ||
      Boolean(selectedColor))

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

              {product.images.length >
                1 && (
                <div className="product-thumbnails">
                  {product.images.map(
                    image => (
                      <button
                        key={image}
                        type="button"
                        className={
                          selectedImage ===
                          image
                            ? 'is-active'
                            : ''
                        }
                        onClick={() =>
                          setSelectedImage(
                            image
                          )
                        }
                      >
                        <img
                          src={image}
                          alt={
                            product.name
                          }
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
                {t(
                  'common.currency'
                )}
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
                      {
                        product.reference
                      }
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
                      {
                        product.categorie
                      }
                    </dd>
                  </div>
                )}

                {formattedDimensions && (
                  <div>
                    <dt>
                      {t(
                        'product.dimensions'
                      )}
                    </dt>

                    <dd>
                      {
                        formattedDimensions
                      }
                    </dd>
                  </div>
                )}
              </dl>

              {colorChoiceRequired && (
                <div className="product-color-section">
                  <div className="product-color-heading">
                    <span>
                      {t(
                        'product.availableColors'
                      )}
                    </span>

                    {selectedColor && (
                      <strong>
                        {selectedColor}
                      </strong>
                    )}
                  </div>

                  <div
                    className="product-color-grid"
                    role="radiogroup"
                    aria-label={t(
                      'product.availableColors'
                    )}
                  >
                    {product.colors.map(
                      color => {
                        const selected =
                          selectedColor ===
                          color

                        return (
                          <button
                            key={color}
                            type="button"
                            role="radio"
                            aria-checked={
                              selected
                            }
                            className={
                              selected
                                ? 'product-color-button is-active'
                                : 'product-color-button'
                            }
                            onClick={() =>
                              setSelectedColor(
                                color
                              )
                            }
                          >
                            {color}
                          </button>
                        )
                      }
                    )}
                  </div>
                </div>
              )}

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
                        setQuantity(
                          current =>
                            Math.max(
                              1,
                              current -
                                1
                            )
                        )
                      }}
                    >
                      −
                    </button>

                    <input
                      type="number"
                      min="1"
                      max={
                        product.stock
                      }
                      value={quantity}
                      onChange={event => {
                        const requestedQuantity =
                          Number(
                            event
                              .target
                              .value
                          ) || 1

                        setQuantity(
                          Math.min(
                            Math.max(
                              1,
                              requestedQuantity
                            ),
                            product.stock
                          )
                        )
                      }}
                    />

                    <button
                      type="button"
                      disabled={
                        quantity >=
                        product.stock
                      }
                      onClick={() => {
                        setQuantity(
                          current =>
                            Math.min(
                              current +
                                1,
                              product.stock
                            )
                        )
                      }}
                    >
                      +
                    </button>
                  </div>
                </label>

                <button
                  type="button"
                  disabled={
                    !canAddToCart
                  }
                  className="primary-button add-cart-button"
                  onClick={() => {
                    add(
                      {
                        ...product,
                        selectedColor:
                          selectedColor ||
                          null,
                      },
                      quantity
                    )
                  }}
                >
                  {t(
                    'common.addToCart'
                  )}
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
                    {
                      product.description
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        .product-color-section {
          display: grid;
          gap: 12px;
          padding: 18px 0;
          border-top: 1px solid
            #e6ded2;
          border-bottom: 1px solid
            #e6ded2;
        }

        .product-color-heading {
          display: flex;
          align-items: center;
          justify-content:
            space-between;
          gap: 12px;
          font-size: 14px;
        }

        .product-color-heading span {
          color: #8a7f72;
          font-weight: 800;
        }

        .product-color-heading strong {
          color: #1f1a14;
        }

        .product-color-grid {
          display: grid;
          grid-template-columns:
            repeat(
              auto-fit,
              minmax(110px, 1fr)
            );
          gap: 10px;
        }

        .product-color-button {
          min-height: 46px;
          padding: 10px 12px;
          border: 1px solid
            #e6ded2;
          border-radius: 14px;
          background: #fff;
          color: #1f1a14;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition:
            border-color 0.2s ease,
            background 0.2s ease,
            color 0.2s ease,
            transform 0.2s ease;
        }

        .product-color-button:hover {
          border-color: #1f1a14;
        }

        .product-color-button.is-active {
          border-color: #1f1a14;
          background: #1f1a14;
          color: #fff;
        }

        .product-color-button:focus-visible {
          outline: 3px solid
            rgba(
              31,
              26,
              20,
              0.2
            );
          outline-offset: 2px;
        }

        @media (max-width: 640px) {
          .product-color-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
          }

          .product-color-button {
            min-height: 44px;
            padding: 9px 8px;
          }
        }
      `}</style>
    </SiteLayout>
  )
}