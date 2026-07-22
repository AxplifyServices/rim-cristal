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

const [
  selectedSizeVariantId,
  setSelectedSizeVariantId,
] = useState('')  

  const [quantity, setQuantity] =
    useState(1)
    
const [
  isImageViewerOpen,
  setIsImageViewerOpen,
] = useState(false)

const [
  imageZoom,
  setImageZoom,
] = useState(1)    

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

const defaultSizeVariant =
  result.primarySizeVariant ||
  result.sizeVariants?.[0] ||
  null

setSelectedSizeVariantId(
  defaultSizeVariant?.id || ''
)      

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



const selectedSizeVariant =
  useMemo(() => {
    if (
      !product?.hasSizeVariants
    ) {
      return null
    }

    return (
      product.sizeVariants.find(
        variant =>
          String(variant.id) ===
          String(
            selectedSizeVariantId
          )
      ) ||
      product.primarySizeVariant ||
      product.sizeVariants[0] ||
      null
    )
  }, [
    product,
    selectedSizeVariantId,
  ])

const displayedPrice =
  selectedSizeVariant
    ? selectedSizeVariant.price
    : product?.price || 0

const displayedOriginalPrice =
  selectedSizeVariant
    ? selectedSizeVariant.originalPrice
    : product?.originalPrice || 0

const displayedPromotionPercentage =
  selectedSizeVariant
    ? selectedSizeVariant
        .promotionPercentage
    : product
        ?.promotionPercentage

const displayedHasPromotion =
  selectedSizeVariant
    ? Boolean(
        selectedSizeVariant
          .hasPromotion
      ) &&
      Number(
        selectedSizeVariant
          .originalPrice
      ) >
        Number(
          selectedSizeVariant.price
        )
    : Boolean(
        product?.hasPromotion
      ) &&
      Number(
        product?.originalPrice
      ) >
        Number(
          product?.price
        )

const displayedStock =
  selectedSizeVariant
    ? selectedSizeVariant.stock
    : Number(
        product?.stock || 0
      )

const selectedSizeLabel =
  selectedSizeVariant?.label ||
  ''


  const formattedDimensions =
    useMemo(() => {
      if (!product) {
        return ''
      }

if (selectedSizeVariant) {
  const variantDimensions = [
    selectedSizeVariant.widthCm,
    selectedSizeVariant.depthCm,
    selectedSizeVariant.heightCm,
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

  if (
    variantDimensions.length > 0
  ) {
    return `${variantDimensions.join(
      ' × '
    )} cm`
  }
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
}, [
  product,
  selectedSizeVariant,
])

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

useEffect(() => {
  if (!isImageViewerOpen) {
    return undefined
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      setIsImageViewerOpen(false)
      setImageZoom(1)
      return
    }

    if (
      event.key === 'ArrowLeft' &&
      hasMultipleImages
    ) {
      setSelectedImageIndex(
        currentIndex =>
          currentIndex === 0
            ? productImages.length - 1
            : currentIndex - 1
      )

      setImageZoom(1)
      return
    }

    if (
      event.key === 'ArrowRight' &&
      hasMultipleImages
    ) {
      setSelectedImageIndex(
        currentIndex =>
          currentIndex ===
          productImages.length - 1
            ? 0
            : currentIndex + 1
      )

      setImageZoom(1)
    }
  }

  const previousOverflow =
    document.body.style.overflow

  document.body.style.overflow =
    'hidden'

  window.addEventListener(
    'keydown',
    handleKeyDown
  )

  return () => {
    document.body.style.overflow =
      previousOverflow

    window.removeEventListener(
      'keydown',
      handleKeyDown
    )
  }
}, [
  isImageViewerOpen,
  hasMultipleImages,
  productImages.length,
])

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

const sizeChoiceRequired =
  product.hasSizeVariants &&
  product.sizeVariants.length > 0

const isOutOfStock =
  displayedStock <= 0

const hasPromotion =
  displayedHasPromotion

const promotionLabel =
  hasPromotion
    ? `-${new Intl.NumberFormat(
        locale === 'ar'
          ? 'ar-MA'
          : 'fr-MA',
        {
          maximumFractionDigits:
            2,
        }
      ).format(
        displayedPromotionPercentage
      )}%`
    : ''

const showStockCounter =
  displayedStock > 0 &&
  displayedStock <= 10

const canAddToCart =
  (
    !sizeChoiceRequired ||
    Boolean(
      selectedSizeVariant
    )
  ) &&
  (
    !colorChoiceRequired ||
    Boolean(selectedColor)
  )

  const whatsappMessageParts = [
    t('product.whatsappMessage'),
    '',
    `${t('product.reference')} : ${product.reference || '-'}`,
    `${t('product.productName')} : ${product.name}`,
    selectedSizeLabel
  ? `${t('product.size')} : ${selectedSizeLabel}`
  : '',
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
    {hasPromotion && (
      <span className="product-promotion-badge product-promotion-badge-detail">
        {promotionLabel}
      </span>
    )}

<button
  type="button"
  className="product-main-image"
  onClick={() => {
    setImageZoom(1)
    setIsImageViewerOpen(true)
  }}
  aria-label={t(
    'product.enlargeImage'
  )}
>
  <img
    src={selectedImage}
    alt={`${product.name} - ${
      selectedImageIndex + 1
    }`}
  />

  <span className="product-image-zoom-hint">
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        cx="11"
        cy="11"
        r="7"
      />

      <path d="m20 20-4.2-4.2" />

      <path d="M11 8v6M8 11h6" />
    </svg>

    <span>
      {t('product.enlargeImage')}
    </span>
  </span>
</button>

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

{isImageViewerOpen && (
  <div
    className="product-image-viewer"
    role="dialog"
    aria-modal="true"
    aria-label={t(
      'product.imageViewer'
    )}
    onMouseDown={event => {
      if (
        event.target ===
        event.currentTarget
      ) {
        setIsImageViewerOpen(
          false
        )

        setImageZoom(1)
      }
    }}
  >
    <div className="product-image-viewer-panel">
      <div className="product-image-viewer-toolbar">
        <div className="product-image-viewer-counter">
          {selectedImageIndex + 1}
          {' / '}
          {productImages.length}
        </div>

        <div className="product-image-viewer-actions">
          <button
            type="button"
            onClick={() => {
              setImageZoom(current =>
                Math.max(
                  1,
                  Number(
                    (
                      current - 0.25
                    ).toFixed(2)
                  )
                )
              )
            }}
            disabled={imageZoom <= 1}
            aria-label={t(
              'product.zoomOut'
            )}
          >
            −
          </button>

          <span>
            {Math.round(
              imageZoom * 100
            )}
            %
          </span>

          <button
            type="button"
            onClick={() => {
              setImageZoom(current =>
                Math.min(
                  3,
                  Number(
                    (
                      current + 0.25
                    ).toFixed(2)
                  )
                )
              )
            }}
            disabled={imageZoom >= 3}
            aria-label={t(
              'product.zoomIn'
            )}
          >
            +
          </button>

          <button
            type="button"
            className="product-image-viewer-reset"
            onClick={() =>
              setImageZoom(1)
            }
          >
            {t('product.resetZoom')}
          </button>

          <button
            type="button"
            className="product-image-viewer-close"
            onClick={() => {
              setIsImageViewerOpen(
                false
              )

              setImageZoom(1)
            }}
            aria-label={t(
              'product.closeViewer'
            )}
          >
            ×
          </button>
        </div>
      </div>

      <div className="product-image-viewer-stage">
        <img
          src={selectedImage}
          alt={`${product.name} - ${
            selectedImageIndex + 1
          }`}
          style={{
            transform: `scale(${imageZoom})`,
          }}
        />
      </div>

      {hasMultipleImages && (
        <>
          <button
            type="button"
            className="product-image-viewer-navigation is-previous"
            onClick={() => {
              showPreviousImage()
              setImageZoom(1)
            }}
            aria-label={t(
              'product.previousImage'
            )}
          >
            ‹
          </button>

          <button
            type="button"
            className="product-image-viewer-navigation is-next"
            onClick={() => {
              showNextImage()
              setImageZoom(1)
            }}
            aria-label={t(
              'product.nextImage'
            )}
          >
            ›
          </button>
        </>
      )}
    </div>
  </div>
)}

            <div className="product-information">
              {product.marque && (
                <p className="section-eyebrow">
                  {product.marque}
                </p>
              )}

              <h1>{product.name}</h1>

              <div
                className={[
                  'detail-price',
                  hasPromotion
                    ? 'has-promotion'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {hasPromotion && (
                  <span className="detail-old-price">
{formatPrice(
  displayedOriginalPrice,
  locale
)}{' '}
                    {t(
                      'common.currency'
                    )}
                  </span>
                )}

                <strong className="detail-current-price">
{formatPrice(
  displayedPrice,
  locale
)}{' '}
                  {t(
                    'common.currency'
                  )}
                </strong>
              </div>

              <div
                className={
                  isOutOfStock
                    ? 'product-stock-notice is-out'
                    : 'product-stock-notice is-available'
                }
              >
                <strong>
                  {isOutOfStock
                    ? t(
                        'product.outOfStock'
                      )
                    : showStockCounter
                      ? t(
                          'product.stockRemaining',
                          {
                            count:
                              displayedStock
                          }
                        )
                      : t(
                          'product.inStock'
                        )}
                </strong>

                {isOutOfStock && (
                  <p>
                    {t(
                      'product.backorderDetailMessage'
                    )}
                  </p>
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

{sizeChoiceRequired && (
  <details
    className="product-option-section"
  >
    <summary className="product-option-summary">
      <span className="product-option-summary-copy">
        <span className="product-option-summary-label">
          {t(
            'product.availableSizes'
          )}
        </span>

        <small>
          {selectedSizeLabel ||
            t(
              'product.selectSizeHelp'
            )}
        </small>
      </span>

      <span
        className="product-option-summary-chevron"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </span>
    </summary>

    <div className="product-option-content">
      <div
        className="product-size-grid"
        role="radiogroup"
        aria-label={t(
          'product.availableSizes'
        )}
      >
        {product.sizeVariants.map(
          variant => {
            const selected =
              String(
                selectedSizeVariant?.id
              ) ===
              String(variant.id)

            const unavailable =
              variant.stock <= 0

            return (
              <button
                key={variant.id}
                type="button"
                role="radio"
                aria-checked={
                  selected
                }
                className={[
                  'product-size-button',
                  selected
                    ? 'is-active'
                    : '',
                  unavailable
                    ? 'is-unavailable'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => {
                  setSelectedSizeVariantId(
                    variant.id
                  )

                  setQuantity(1)
                }}
              >
                <span className="product-size-button-main">
                  <strong>
                    {variant.label}
                  </strong>

                  {variant.reference && (
                    <small>
                      {
                        variant.reference
                      }
                    </small>
                  )}
                </span>

                <span className="product-size-button-price">
                  {formatPrice(
                    variant.price,
                    locale
                  )}{' '}
                  {t(
                    'common.currency'
                  )}
                </span>

                <span
                  className={
                    unavailable
                      ? 'product-size-stock is-unavailable'
                      : 'product-size-stock'
                  }
                >
                  {unavailable
                    ? t(
                        'product.sizeOnOrder'
                      )
                    : t(
                        'product.sizeAvailable'
                      )}
                </span>
              </button>
            )
          }
        )}
      </div>
    </div>
  </details>
)}

{colorChoiceRequired && (
  <details
    className="product-color-section"
    
  >
    <summary className="product-option-summary">
      <span className="product-option-summary-copy">
        <span className="product-option-summary-label">
          {t(
            'product.availableColors'
          )}
        </span>

        <small>
          {selectedColor ||
            t(
              'product.selectColorHelp'
            )}
        </small>
      </span>

      <span
        className="product-option-summary-chevron"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </span>
    </summary>

    <div className="product-option-content">
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
  </details>
)}

              <div className="buy-row">
<label className="product-quantity-field">
  <span>
    {t('product.quantity')}
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
      max={
        isOutOfStock
          ? undefined
          : displayedStock
      }
      value={quantity}
      onChange={event => {
        const requestedQuantity =
          Math.max(
            1,
            Number(
              event.target.value
            ) || 1
          )

        setQuantity(
          isOutOfStock
            ? requestedQuantity
            : Math.min(
                requestedQuantity,
                displayedStock
              )
        )
      }}
    />

    <button
      type="button"
      disabled={
        !isOutOfStock &&
        quantity >= displayedStock
      }
      onClick={() => {
        setQuantity(current =>
          isOutOfStock
            ? current + 1
            : Math.min(
                current + 1,
                displayedStock
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

    price:
      displayedPrice,

    originalPrice:
      displayedOriginalPrice,

    productSizeVariantId:
      selectedSizeVariant?.id ||
      null,

    selectedSize:
      selectedSizeLabel ||
      null,

    selectedColor:
      selectedColor ||
      null,

    stock:
      displayedStock,

    isBackorder:
      isOutOfStock,
  },
  quantity
)
                  }}
                >
                  {t(
                    isOutOfStock
                      ? 'product.orderProduct'
                      : 'common.addToCart'
                  )}
                </button>
              </div>

 {whatsappProductUrl && (
                <a
                  href={whatsappProductUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="product-whatsapp-button"
                >
                  <span
                    className="product-whatsapp-icon"
                    aria-hidden="true"
                  >
<svg
  viewBox="0 0 32 32"
  aria-hidden="true"
  focusable="false"
>
  <path
    fill="currentColor"
    d="M16.04 3C8.85 3 3 8.74 3 15.8c0 2.26.6 4.46 1.75 6.39L3 29l7-1.81A13.17 13.17 0 0 0 16.04 28C23.23 28 29 22.27 29 15.2 29 8.74 23.23 3 16.04 3Zm0 22.84c-1.93 0-3.82-.51-5.46-1.49l-.39-.23-4.15 1.07 1.11-4.02-.25-.41a9.55 9.55 0 0 1-1.48-5.08c0-5.87 4.78-10.64 10.66-10.64 5.88 0 10.56 4.77 10.56 10.64 0 5.87-4.72 10.16-10.6 10.16Zm5.84-7.95c-.32-.16-1.89-.92-2.18-1.03-.29-.11-.5-.16-.71.16-.21.32-.82 1.03-1 1.24-.18.21-.37.24-.69.08-.32-.16-1.34-.49-2.56-1.57-.95-.84-1.59-1.88-1.77-2.2-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.55.16-.18.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.71-1.71-.98-2.34-.26-.62-.52-.54-.71-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.08-1.11 2.63 0 1.55 1.14 3.05 1.3 3.26.16.21 2.24 3.42 5.43 4.8.76.33 1.35.52 1.81.67.76.24 1.45.21 2 .13.61-.09 1.89-.77 2.16-1.51.27-.74.27-1.37.19-1.5-.08-.13-.29-.21-.61-.37Z"
  />
</svg>
                  </span>

                  <span>
                    <strong>
                      {t(
                        'product.whatsappButton'
                      )}
                    </strong>

                    <small>
                      {t(
                        'product.whatsappHelp'
                      )}
                    </small>
                  </span>
                </a>
              )}

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


    </SiteLayout>
  )
}