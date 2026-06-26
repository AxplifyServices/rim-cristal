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

function normalizeWhatsAppNumber(value) {
  return String(value || '').replace(/\D/g, '')
}

export default function ProductPage({
  slug,
}) {
  const { add } = useCart()
  const { locale, t } =
    useSiteI18n()

  const whatsappNumber =
    normalizeWhatsAppNumber(
      process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
    )

  const [product, setProduct] =
    useState(null)

const [
  selectedImageIndex,
  setSelectedImageIndex,
] = useState(0)

const [
  touchStartX,
  setTouchStartX,
] = useState(null)

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
        await getProductBySlug(slug)

      if (!active) {
        return
      }

      setProduct(result)
      setSelectedImageIndex(0)

      setSelectedColor(
        result.hasColorVariants &&
        result.colors.length > 0
          ? result.colors[0]
          : ''
      )

      setQuantity(1)
    } catch (loadError) {
      console.error(loadError)

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
}, [slug, t])


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

const productImages =
  useMemo(() => {
    if (!product) {
      return []
    }

    const images =
      product.images?.length > 0
        ? product.images
        : [product.image]

    return images
      .filter(Boolean)
      .filter((image, index, list) => {
        return list.indexOf(image) === index
      })
  }, [product])

const selectedImage =
  productImages[selectedImageIndex] ||
  product?.image ||
  ''

const hasMultipleImages =
  productImages.length > 1

function showPreviousImage() {
  if (!hasMultipleImages) {
    return
  }

  setSelectedImageIndex(currentIndex => {
    return currentIndex === 0
      ? productImages.length - 1
      : currentIndex - 1
  })
}

function showNextImage() {
  if (!hasMultipleImages) {
    return
  }

  setSelectedImageIndex(currentIndex => {
    return currentIndex ===
      productImages.length - 1
      ? 0
      : currentIndex + 1
  })
}

function handleTouchStart(event) {
  setTouchStartX(
    event.touches[0]?.clientX ?? null
  )
}

function handleTouchEnd(event) {
  if (touchStartX === null) {
    return
  }

  const touchEndX =
    event.changedTouches[0]?.clientX

  if (touchEndX === undefined) {
    setTouchStartX(null)
    return
  }

  const distance =
    touchStartX - touchEndX

  const minimumSwipeDistance = 45

  if (
    Math.abs(distance) >=
    minimumSwipeDistance
  ) {
    if (distance > 0) {
      showNextImage()
    } else {
      showPreviousImage()
    }
  }

  setTouchStartX(null)
}    

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

  const whatsappMessageParts = [
    t('product.whatsappMessage'),
    '',
    `${t('product.reference')} : ${product.reference || '-'}`,
    `${t('product.productName')} : ${product.name}`,
    selectedColor
      ? `${t('product.selectedColor')} : ${selectedColor}`
      : '',
    typeof window !== 'undefined'
      ? `${t('product.productLink')} : ${window.location.href}`
      : '',
  ].filter(Boolean)

  const whatsappProductUrl =
    whatsappNumber
      ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
          whatsappMessageParts.join('\n')
        )}`
      : ''

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
  <div
    className="product-carousel"
    onTouchStart={handleTouchStart}
    onTouchEnd={handleTouchEnd}
  >
    <div className="product-main-image">
      <img
        src={selectedImage}
        alt={`${product.name} - ${
          selectedImageIndex + 1
        }`}
      />
    </div>

    {hasMultipleImages && (
      <>
        <button
          type="button"
          className="product-carousel-button product-carousel-previous"
          onClick={showPreviousImage}
          aria-label={t(
            'product.previousImage'
          )}
        >
          ‹
        </button>

        <button
          type="button"
          className="product-carousel-button product-carousel-next"
          onClick={showNextImage}
          aria-label={t(
            'product.nextImage'
          )}
        >
          ›
        </button>

        <div className="product-image-counter">
          {selectedImageIndex + 1}
          {' / '}
          {productImages.length}
        </div>
      </>
    )}
  </div>

  {hasMultipleImages && (
    <div
      className="product-carousel-dots"
      aria-label={t(
        'product.imageGallery'
      )}
    >
      {productImages.map(
        (image, index) => (
          <button
            key={`${image}-${index}`}
            type="button"
            className={
              selectedImageIndex ===
              index
                ? 'product-carousel-dot is-active'
                : 'product-carousel-dot'
            }
            onClick={() =>
              setSelectedImageIndex(
                index
              )
            }
            aria-label={`${t(
              'product.showImage'
            )} ${index + 1}`}
            aria-current={
              selectedImageIndex ===
              index
                ? 'true'
                : undefined
            }
          />
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