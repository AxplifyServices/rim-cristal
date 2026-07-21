'use client'

import {
  useEffect,
  useRef,
  useState,
} from 'react'

import Image from 'next/image'
import Link from 'next/link'
import {
  useRouter,
} from 'next/navigation'

import { useCart } from '../context/CartContext'
import {
  useFavorites,
} from '../context/FavoritesContext'
import { useSiteI18n } from '../i18n/SiteI18nProvider'
import { formatPrice } from '../lib/products'

const SWIPE_THRESHOLD = 42
const ADDED_FEEDBACK_DURATION = 1100

function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M15 18 9 12l6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="m9 18 6-6-6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function HeartIcon({
  filled = false,
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"
        fill={
          filled
            ? 'currentColor'
            : 'none'
        }
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ShoppingBagIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M5.4 8.5h13.2l.9 11.5h-15l.9-11.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M9 9V6.7a3 3 0 0 1 6 0V9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="m5 12.5 4.2 4.2L19 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function ProductCard({
  product,
  imagePriority = false,
}) {
  const router = useRouter()
  const { add } = useCart()

  const {
    isFavorite,
    toggleFavorite,
  } = useFavorites()

  const { locale, t } =
    useSiteI18n()

  const [imageIndex, setImageIndex] =
    useState(0)

const [
  shouldPreloadAdjacent,
  setShouldPreloadAdjacent,
] = useState(false)    

  const [
    recentlyAdded,
    setRecentlyAdded,
  ] = useState(false)

const cardRef =
  useRef(null)  

  const touchStartXRef =
    useRef(null)

  const swipeDetectedRef =
    useRef(false)

  const addedTimerRef =
    useRef(null)

  const productImages =
    Array.isArray(
      product.imageVariants
    ) &&
    product.imageVariants.length > 0
      ? product.imageVariants
          .map(image => {
            return (
              image.card ||
              image.detail ||
              image.original
            )
          })
          .filter(Boolean)
          .filter(
            (
              image,
              index,
              list
            ) => {
              return (
                list.indexOf(
                  image
                ) === index
              )
            }
          )
      : [
          ...new Set(
            (
              Array.isArray(
                product.images
              ) &&
              product.images.length >
                0
                ? product.images
                : [
                    product.cardImage ||
                      product.image ||
                      '/images/product-placeholder.svg',
                  ]
            ).filter(Boolean)
          ),
        ]

  const currentImage =
    productImages[imageIndex] ||
    productImages[0]

  const hasMultipleImages =
    productImages.length > 1

const previousImageIndex =
  imageIndex === 0
    ? productImages.length - 1
    : imageIndex - 1

const nextImageIndex =
  imageIndex ===
  productImages.length - 1
    ? 0
    : imageIndex + 1

const adjacentImages =
  hasMultipleImages
    ? [
        productImages[
          previousImageIndex
        ],

        productImages[
          nextImageIndex
        ],
      ]
        .filter(Boolean)
        .filter(
          (
            image,
            index,
            list
          ) => {
            return (
              image !==
                currentImage &&
              list.indexOf(
                image
              ) === index
            )
          }
        )
    : []    

  const productIsFavorite =
    isFavorite(product.id)

  const productMeta =
    product.marque ||
    product.famille ||
    product.categorie

  const stock = Math.max(
    Number(product.stock || 0),
    0
  )

  const isOutOfStock =
    stock <= 0

  const hasPromotion =
    Boolean(
      product.hasPromotion
    ) &&
    Number(
      product.promotionPercentage
    ) > 0 &&
    Number(
      product.originalPrice
    ) >
      Number(
        product.price
      )

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
          product.promotionPercentage
        )}%`
      : ''

  const requiresConfiguration =
    Boolean(
      product.hasColorVariants &&
        Array.isArray(
          product.colors
        ) &&
        product.colors.length > 0
    )

useEffect(() => {
  setImageIndex(0)
  setRecentlyAdded(false)
  setShouldPreloadAdjacent(false)
}, [product.id])

useEffect(() => {
  const cardElement =
    cardRef.current

  if (
    !cardElement ||
    !hasMultipleImages
  ) {
    return undefined
  }

  if (
    typeof IntersectionObserver ===
    'undefined'
  ) {
    setShouldPreloadAdjacent(
      true
    )

    return undefined
  }

  const observer =
    new IntersectionObserver(
      entries => {
        const entry =
          entries[0]

        if (
          !entry?.isIntersecting
        ) {
          return
        }

        setShouldPreloadAdjacent(
          true
        )

        observer.disconnect()
      },
      {
        /*
         * On commence le téléchargement avant que
         * la carte entre complètement dans l'écran.
         */
        rootMargin:
          '220px 0px',

        threshold: 0.01,
      }
    )

  observer.observe(
    cardElement
  )

  return () => {
    observer.disconnect()
  }
}, [
  product.id,
  hasMultipleImages,
])

  useEffect(() => {
    return () => {
      if (
        addedTimerRef.current
      ) {
        window.clearTimeout(
          addedTimerRef.current
        )
      }
    }
  }, [])

  function showPreviousImage() {
    if (!hasMultipleImages) {
      return
    }

    setImageIndex(current =>
      current === 0
        ? productImages.length - 1
        : current - 1
    )
  }

  function showNextImage() {
    if (!hasMultipleImages) {
      return
    }

    setImageIndex(current =>
      current ===
      productImages.length - 1
        ? 0
        : current + 1
    )
  }

  function handlePreviousImage(
    event
  ) {
    event.preventDefault()
    event.stopPropagation()

setShouldPreloadAdjacent(
  true
)

    showPreviousImage()
  }

  function handleNextImage(
    event
  ) {
    event.preventDefault()
    event.stopPropagation()

setShouldPreloadAdjacent(
  true
)

    showNextImage()
  }

  function handleTouchStart(
    event
  ) {
    if (!hasMultipleImages) {
      return
    }

setShouldPreloadAdjacent(
  true
)    

    touchStartXRef.current =
      event.touches[0]?.clientX ??
      null

    swipeDetectedRef.current =
      false
  }

  function handleTouchEnd(
    event
  ) {
    if (
      !hasMultipleImages ||
      touchStartXRef.current ===
        null
    ) {
      return
    }

    const touchEndX =
      event.changedTouches[0]
        ?.clientX

    if (
      typeof touchEndX !==
      'number'
    ) {
      touchStartXRef.current =
        null

      return
    }

    const movement =
      touchEndX -
      touchStartXRef.current

    touchStartXRef.current =
      null

    if (
      Math.abs(movement) <
      SWIPE_THRESHOLD
    ) {
      return
    }

    swipeDetectedRef.current =
      true

    if (movement > 0) {
      showPreviousImage()
    } else {
      showNextImage()
    }
  }

  function handleImageLinkClick(
    event
  ) {
    if (
      swipeDetectedRef.current
    ) {
      event.preventDefault()
      swipeDetectedRef.current =
        false
    }
  }

  function handleFavorite(
    event
  ) {
    event.preventDefault()
    event.stopPropagation()

    toggleFavorite(product.id)
  }

  function showAddedFeedback() {
    if (
      addedTimerRef.current
    ) {
      window.clearTimeout(
        addedTimerRef.current
      )
    }

    setRecentlyAdded(true)

    addedTimerRef.current =
      window.setTimeout(() => {
        setRecentlyAdded(false)
      }, ADDED_FEEDBACK_DURATION)
  }

  function handleProductAction() {
    if (requiresConfiguration) {
      router.push(
        `/product/${product.slug}`
      )

      return
    }

    add({
      ...product,

      selectedColor: null,

      isBackorder:
        isOutOfStock,
    })

    showAddedFeedback()
  }

  const actionLabel =
    requiresConfiguration
      ? t(
          'product.chooseOptions'
        )
      : isOutOfStock
        ? t(
            'product.orderProduct'
          )
        : t(
            'common.addToCart'
          )



  return (
<article
  ref={cardRef}
  className={[
        'product-card',

        isOutOfStock
          ? 'is-out-of-stock'
          : '',

        recentlyAdded
          ? 'has-recently-added'
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className="product-image-wrap"
        onTouchStart={
          handleTouchStart
        }
        onTouchEnd={
          handleTouchEnd
        }
      >
        {hasPromotion && (
          <span className="product-promotion-badge">
            {promotionLabel}
          </span>
        )}        
        <Link
          href={`/product/${product.slug}`}
          className="product-image-link"
          aria-label={product.name}
          onClick={
            handleImageLinkClick
          }
        >
<Image
  key={`${product.id}-${currentImage}`}
  src={currentImage}
  alt={product.name}
  fill
  sizes="
    (max-width: 520px) 50vw,
    (max-width: 900px) 33vw,
    (max-width: 1280px) 25vw,
    320px
  "
  priority={
    imagePriority &&
    imageIndex === 0
  }
  quality={76}
  className="product-image product-image-current"
/>

{shouldPreloadAdjacent &&
  adjacentImages.map(
    image => (
      <Image
        key={`preload-${product.id}-${image}`}
        src={image}
        alt=""
        aria-hidden="true"
        fill
        sizes="
          (max-width: 520px) 50vw,
          (max-width: 900px) 33vw,
          (max-width: 1280px) 25vw,
          320px
        "
        quality={76}
        loading="eager"
        className="product-image product-image-preload"
      />
    )
  )}
        </Link>

        <button
          type="button"
          className={[
            'product-favorite-button',

            productIsFavorite
              ? 'is-active'
              : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={
            handleFavorite
          }
          aria-pressed={
            productIsFavorite
          }
          aria-label={t(
            productIsFavorite
              ? 'product.removeFromFavorites'
              : 'product.addToFavorites'
          )}
          title={t(
            productIsFavorite
              ? 'product.removeFromFavorites'
              : 'product.addToFavorites'
          )}
        >
          <HeartIcon
            filled={
              productIsFavorite
            }
          />
        </button>



        {hasMultipleImages && (
          <>
            <button
              type="button"
              className="product-image-arrow product-image-arrow-previous"
              onClick={
                handlePreviousImage
              }
              aria-label={t(
                'product.previousImage'
              )}
              title={t(
                'product.previousImage'
              )}
            >
              <ArrowLeftIcon />
            </button>

            <button
              type="button"
              className="product-image-arrow product-image-arrow-next"
              onClick={
                handleNextImage
              }
              aria-label={t(
                'product.nextImage'
              )}
              title={t(
                'product.nextImage'
              )}
            >
              <ArrowRightIcon />
            </button>
          </>
        )}
      </div>

      <div className="product-card-body">
        <div className="product-card-content">
          {productMeta && (
            <p className="product-meta">
              {productMeta}
            </p>
          )}

          <Link
            href={`/product/${product.slug}`}
            className="product-name"
          >
            {product.name}
          </Link>

          {product.reference && (
            <p className="product-reference">
              {product.reference}
            </p>
          )}
        </div>

        <div className="product-card-footer">
          <div
            className={[
              'product-card-prices',
              hasPromotion
                ? 'has-promotion'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {hasPromotion && (
              <span className="product-old-price">
                {formatPrice(
                  product.originalPrice,
                  locale
                )}{' '}
                {t(
                  'common.currency'
                )}
              </span>
            )}

            <strong className="product-price">
              {formatPrice(
                product.price,
                locale
              )}{' '}
              <span>
                {t(
                  'common.currency'
                )}
              </span>
            </strong>
          </div>

          <button
            type="button"
            className={[
              'small-add',

              isOutOfStock
                ? 'is-backorder'
                : '',

              recentlyAdded
                ? 'is-success'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={
              handleProductAction
            }
            aria-label={`${actionLabel} : ${product.name}`}
            title={actionLabel}
          >
            {recentlyAdded ? (
              <CheckIcon />
            ) : (
              <ShoppingBagIcon />
            )}
          </button>
        </div>
      </div>
    </article>
  )
}