'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '../context/CartContext'

const BADGE_CLASS = { sale: 'badge-sale', new: 'badge-new', bestseller: 'badge-bestseller' }

function Stars({ rating }) {
  return (
    <div className="p-stars">
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ opacity: i <= Math.round(rating) ? 1 : 0.2 }}>★</span>
      ))}
    </div>
  )
}

export default function ProductCard({ product }) {
  const { addToCart, toggleWishlist, isWishlisted } = useCart()
  const [added, setAdded] = useState(false)
  const router  = useRouter()
  const wished  = isWishlisted(product.id)

  const handleAdd = (e) => {
    e.stopPropagation()
    addToCart(product, 1, product.colors[0], product.sizes[0])
    setAdded(true)
    setTimeout(() => setAdded(false), 1600)
  }

  const handleWish = (e) => {
    e.stopPropagation()
    toggleWishlist(product.id)
  }

  const save = Math.round(product.originalPrice - product.salePrice)

  return (
    <div className="p-card" onClick={() => router.push(`/product/${product.slug}`)}>
      <div className="p-img-wrap">
        <img className="img-a" src={product.images[0]} alt={product.name} loading="lazy" />
        <img className="img-b" src={product.images[1]} alt={product.name} loading="lazy" />
        <span className={`p-card-badge badge ${BADGE_CLASS[product.badgeType] || 'badge-sale'}`}>
          {product.badge}
        </span>
        <button className={`p-wish${wished ? ' liked' : ''}`} onClick={handleWish} aria-label="Wishlist">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
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
          <span className="p-orig">${product.originalPrice.toFixed(2)}</span>
          <span className="p-sale">${product.salePrice.toFixed(2)}</span>
          <span className="p-save">Save ${save}</span>
        </div>

        <div className="p-atc-wrap">
          <button
            className={`btn-atc${added ? ' done' : ''}`}
            onClick={handleAdd}
          >
            {added ? '✓ Added to Bag' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  )
}
