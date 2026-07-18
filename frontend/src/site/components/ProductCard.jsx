'use client'

import {
  useEffect,
  useState,
} from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { useCart } from '../context/CartContext'
import {
  useFavorites,
} from '../context/FavoritesContext'
import { useSiteI18n } from '../i18n/SiteI18nProvider'
import { formatPrice } from '../lib/products'

const STOCK_COUNTER_THRESHOLD = 10

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
        strokeWidth="2"
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
        strokeWidth="2"
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
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function ProductCard({
  product,
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

  const productImages =
    Array.isArray(product.images) &&
    product.images.length > 0
      ? product.images.filter(Boolean)
      : [
          product.image ||
            '/images/product-placeholder.svg',
        ]

  const currentImage =
    productImages[imageIndex] ||
    productImages[0]

  const hasMultipleImages =
    productImages.length > 1

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

  const showStockCounter =
    stock > 0 &&
    stock <=
      STOCK_COUNTER_THRESHOLD

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
  }, [product.id])

  function showPreviousImage(
    event
  ) {
    event.preventDefault()
    event.stopPropagation()

    setImageIndex(current =>
      current === 0
        ? productImages.length - 1
        : current - 1
    )
  }

  function showNextImage(
    event
  ) {
    event.preventDefault()
    event.stopPropagation()

    setImageIndex(current =>
      current ===
      productImages.length - 1
        ? 0
        : current + 1
    )
  }

  function handleFavorite(
    event
  ) {
    event.preventDefault()
    event.stopPropagation()

    toggleFavorite(product.id)
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
      className={
        isOutOfStock
          ? 'product-card is-out-of-stock'
          : 'product-card'
      }
    >
      <div className="product-image-wrap">
        <Link
          href={`/product/${product.slug}`}
          className="product-image-link"
          aria-label={product.name}
        >
          <img
            key={currentImage}
            src={currentImage}
            alt={`${product.name} - ${
              imageIndex + 1
            }`}
            className="product-image"
            loading="lazy"
          />
        </Link>

        <button
          type="button"
          className={
            productIsFavorite
              ? 'product-favorite-button is-active'
              : 'product-favorite-button'
          }
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

        {product.badge && (
          <span className="product-badge">
            {product.badge}
          </span>
        )}

        {isOutOfStock && (
          <span className="product-stock-badge is-out">
            {t(
              'product.outOfStock'
            )}
          </span>
        )}

        {!isOutOfStock &&
          showStockCounter && (
            <span className="product-stock-badge is-available">
              {t(
                'product.stockRemaining',
                {
                  count: stock,
                }
              )}
            </span>
          )}

        {hasMultipleImages && (
          <>
            <button
              type="button"
              className="product-image-arrow product-image-arrow-previous"
              onClick={
                showPreviousImage
              }
              aria-label={t(
                'product.previousImage'
              )}
            >
              <ArrowLeftIcon />
            </button>

            <button
              type="button"
              className="product-image-arrow product-image-arrow-next"
              onClick={
                showNextImage
              }
              aria-label={t(
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

          {isOutOfStock && (
            <p className="product-backorder-message">
              {t(
                'product.backorderCardMessage'
              )}
            </p>
          )}
        </div>

        <div className="product-card-footer">
          <strong className="product-price">
            {formatPrice(
              product.price,
              locale
            )}{' '}
            {t(
              'common.currency'
            )}
          </strong>

          <button
            type="button"
            className={
              isOutOfStock
                ? 'small-add is-backorder'
                : 'small-add'
            }
            onClick={
              handleProductAction
            }
            aria-label={`${actionLabel} : ${product.name}`}
            title={actionLabel}
          >
            {requiresConfiguration
              ? '→'
              : '+'}
          </button>
        </div>
      </div>
    </article>
  )
}