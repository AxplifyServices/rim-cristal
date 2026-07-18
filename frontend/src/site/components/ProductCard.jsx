'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { useCart } from '../context/CartContext'
import { useSiteI18n } from '../i18n/SiteI18nProvider'
import { formatPrice } from '../lib/products'

const STOCK_COUNTER_THRESHOLD = 10

export default function ProductCard({
  product,
}) {
  const router = useRouter()
  const { add } = useCart()
  const { locale, t } =
    useSiteI18n()

  const productMeta =
    product.marque ||
    product.famille ||
    product.categorie

  const stock =
    Math.max(
      Number(product.stock || 0),
      0
    )

  const isOutOfStock =
    stock <= 0

  const showStockCounter =
    stock >=
    STOCK_COUNTER_THRESHOLD

  const requiresConfiguration =
    Boolean(
      product.hasColorVariants &&
      Array.isArray(
        product.colors
      ) &&
      product.colors.length > 0
    )

  function handleProductAction() {
    /*
     * Un produit nécessitant un choix
     * de couleur ne doit jamais être
     * ajouté directement depuis une carte.
     */
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
      <Link
        href={`/product/${product.slug}`}
        className="product-image-wrap"
      >
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

        <img
          src={product.image}
          alt={product.name}
          className="product-image"
          loading="lazy"
        />
      </Link>

      <div className="product-card-body">
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