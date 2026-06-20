'use client'

import Link from 'next/link'
import { useCart } from '../context/CartContext'
import { useSiteI18n } from '../i18n/SiteI18nProvider'
import { formatPrice } from '../lib/products'

export default function ProductCard({
  product,
}) {
  const { add } = useCart()
  const { locale, t } = useSiteI18n()

  const productMeta =
    product.marque ||
    product.famille ||
    product.categorie

  return (
    <article className="product-card">
      <Link
        href={`/product/${product.slug}`}
        className="product-image-wrap"
      >
        {product.badge && (
          <span className="product-badge">
            {product.badge}
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

        <div className="product-card-footer">
          <strong className="product-price">
            {formatPrice(
              product.price,
              locale
            )}{' '}
            {t('common.currency')}
          </strong>

          <button
            type="button"
            className="small-add"
            onClick={() => add(product)}
            aria-label={`${t(
              'common.addToCart'
            )} : ${product.name}`}
          >
            +
          </button>
        </div>
      </div>
    </article>
  )
}