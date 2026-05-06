'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '../context/CartContext'

const BADGE_CLASS = {
  sale: 'badge-sale',
  new: 'badge-new',
  bestseller: 'badge-bestseller',
}

const PLACEHOLDER_IMAGE = '/placeholder-product.svg'

function formatPrice(value) {
  const n = Number(value || 0)

  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    maximumFractionDigits: 0,
  }).format(n)
}

function Stars({ rating }) {
  return (
    <div className="p-stars">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ opacity: i <= Math.round(rating || 0) ? 1 : 0.2 }}>
          ★
        </span>
      ))}
    </div>
  )
}

export default function ProductCard({ product }) {
  const { addToCart, toggleWishlist, isWishlisted } = useCart()
  const [added, setAdded] = useState(false)
  const router = useRouter()

  const wished = isWishlisted(product.id)

  const image1 = product.images?.[0] || PLACEHOLDER_IMAGE
  const image2 = product.images?.[1] && product.images[1] !== image1
    ? product.images[1]
    : null

  const hasSecondImage = Boolean(image2)

  const originalPrice = Number(product.originalPrice || 0)
  const salePrice = Number(product.salePrice || originalPrice || 0)
  const save = Math.max(0, Math.round(originalPrice - salePrice))

  const hasDiscount = save > 0
  const hasBadge = Boolean(product.badge)

  const handleAdd = e => {
    e.stopPropagation()

    addToCart(
      product,
      1,
      product.colors?.[0] || null,
      product.sizes?.[0] || null,
    )

    setAdded(true)
    setTimeout(() => setAdded(false), 1600)
  }

  const handleWish = e => {
    e.stopPropagation()
    toggleWishlist(product.id)
  }

  const handleImgError = e => {
    e.currentTarget.src = PLACEHOLDER_IMAGE
  }

  return (
    <div
    className={`p-card${hasSecondImage ? ' has-second-image' : ''}`}
    onClick={() => router.push(`/product/${product.slug}`)}
  >
      <div className="p-img-wrap">
        <img
          className="img-a"
          src={image1}
          alt={product.name}
          loading="lazy"
          onError={handleImgError}
        />

        {hasSecondImage && (
          <img
            className="img-b"
            src={image2}
            alt={product.name}
            loading="lazy"
            onError={handleImgError}
          />
        )}

        {hasBadge && (
          <span className={`p-card-badge badge ${BADGE_CLASS[product.badgeType] || 'badge-sale'}`}>
            {product.badge}
          </span>
        )}

        <button
          className={`p-wish${wished ? ' liked' : ''}`}
          onClick={handleWish}
          aria-label="Wishlist"
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      <div className="p-body">
        <div className="p-cat">{product.categoryLabel}</div>
        <div className="p-name">{product.name}</div>

        <div className="p-rating">
          <Stars rating={product.rating} />
          <span className="p-rev">({product.reviews})</span>
        </div>

        <div className="p-prices">
          {hasDiscount && (
            <span className="p-orig">{formatPrice(originalPrice)}</span>
          )}

          <span className="p-sale">{formatPrice(salePrice)}</span>

          {hasDiscount && (
            <span className="p-save">Éco {formatPrice(save)}</span>
          )}
        </div>

        <div className="p-atc-wrap">
          <button
            type="button"
            className={`btn-atc${added ? ' done' : ''}`}
            onClick={handleAdd}
          >
            {added ? '✓ Ajouté' : 'Ajouter au panier'}
          </button>
        </div>
      </div>
    </div>
  )
}