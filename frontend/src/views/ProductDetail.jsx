'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import ProductCard from '../components/ProductCard'
import { fetchProductBySlug, fetchProducts, mapProduct } from '../lib/products'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

function Stars({ rating, count }) {
  return (
    <div className="pd-rating">
      <div className="stars">
        {[1,2,3,4,5].map(i => <span key={i} style={{ opacity: i <= Math.round(rating) ? 1 : 0.2 }}>★</span>)}
      </div>
      <span className="pd-rating-count">{rating} ({count} reviews)</span>
    </div>
  )
}

function AccordionItem({ title, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="pd-acc-item">
      <button className={`pd-acc-btn${open ? ' open' : ''}`} onClick={() => setOpen(v => !v)}>
        {title}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {open && <div className="pd-acc-body">{children}</div>}
    </div>
  )
}

export default function ProductDetail() {
  const { slug }  = useParams()
  const router    = useRouter()
  const { addToCart, toggleWishlist, isWishlisted, openDrawer } = useCart()
  const { isAuthenticated } = useAuth()

  const [product, setProduct]   = useState(null)
  const [related, setRelated]   = useState([])
  const [reviews, setReviews]   = useState([])
  const [loading, setLoading]   = useState(true)

  const [activeImg, setActiveImg] = useState(0)
  const [selColor, setSelColor]   = useState('')
  const [selSize, setSelSize]     = useState('')
  const [qty, setQty]             = useState(1)
  const [adding, setAdding]       = useState(false)

  // Review form
  const [showReview, setShowReview] = useState(false)
  const [rev, setRev] = useState({ rating: 5, title: '', body: '', guest_name: '', guest_email: '' })
  const [revLoading, setRevLoading] = useState(false)
  const [revSuccess, setRevSuccess] = useState(false)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    fetchProductBySlug(slug)
      .then(raw => {
        if (!raw) return
        const p = mapProduct(raw)
        setProduct(p)
        setSelColor(p.colors[0] || '')
        setSelSize(p.sizes[0] || '')
        // Fetch related
        fetchProducts({ categorie: p.categorie, page_size: 5 }).then(data => {
          setRelated((data.items || []).map(mapProduct).filter(r => r.id !== p.id).slice(0, 4))
        })
        // Fetch reviews
        fetch(`${API}/products/${raw.id}/reviews`)
          .then(r => r.json())
          .then(data => setReviews(data.items || []))
          .catch(() => {})
      })
      .finally(() => setLoading(false))
  }, [slug])

  const handleAdd = () => {
    if (!product) return
    addToCart(product, qty, selColor, selSize)
    setAdding(true)
    setTimeout(() => { setAdding(false); openDrawer() }, 800)
  }

  const submitReview = async (e) => {
    e.preventDefault()
    if (!product) return
    setRevLoading(true)
    try {
      const payload = { rating: rev.rating, title: rev.title, body: rev.body }
      if (!isAuthenticated) { payload.guest_name = rev.guest_name; payload.guest_email = rev.guest_email }
      await fetch(`${API}/products/${product.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setRevSuccess(true)
      setShowReview(false)
    } catch {}
    finally { setRevLoading(false) }
  }

  if (loading) {
    return (
      <div className="page-wrap" style={{ padding: '80px 40px', textAlign: 'center' }}>
        <p style={{ color: '#999' }}>Loading product…</p>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="page-wrap" style={{ padding: '80px 40px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 28, marginBottom: 16 }}>Product not found</h2>
        <button className="btn btn-dark" onClick={() => router.push('/shop')}>Back to Shop</button>
      </div>
    )
  }

  const wished = isWishlisted(product.id)
  const save   = (product.originalPrice - product.salePrice).toFixed(2)

  return (
    <div className="page-wrap">
      <div className="pd-grid">
        {/* Gallery */}
        <div className="pd-gallery">
          <div className="pd-main-img">
            <img src={product.images[activeImg] || product.images[0]} alt={product.name} />
          </div>
          <div className="pd-thumbs">
            {product.images.map((img, i) => (
              <div key={i} className={`pd-thumb${activeImg === i ? ' active' : ''}`} onClick={() => setActiveImg(i)}>
                <img src={img} alt={`${product.name} view ${i + 1}`} loading="lazy" />
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="pd-info">
          <div className="pd-breadcrumb">
            <Link href="/">Home</Link>
            <span style={{ opacity: .4 }}>›</span>
            <Link href="/shop">Shop</Link>
            <span style={{ opacity: .4 }}>›</span>
            <Link href={`/shop/${product.category}`}>{product.categoryLabel}</Link>
            <span style={{ opacity: .4 }}>›</span>
            <span style={{ color: 'var(--text-3)' }}>{product.name}</span>
          </div>

          <div className="pd-category">{product.categoryLabel}</div>
          <h1 className="pd-name">{product.name}</h1>
          <Stars rating={product.rating} count={product.reviews} />

          <div className="pd-prices">
            <span className="pd-sale">${product.salePrice.toFixed(2)}</span>
            {product.discount > 0 && <>
              <span className="pd-orig">${product.originalPrice.toFixed(2)}</span>
              <span className="pd-save-tag">Save ${save} ({product.discount}% off)</span>
            </>}
          </div>

          <div className="pd-divider" />

          {product.colors.length > 0 && <>
            <div className="pd-opt-label">Finish / Colour <span>{selColor}</span></div>
            <div className="color-opts">
              {product.colors.map(c => (
                <div key={c} className={`color-opt${selColor === c ? ' on' : ''}`}
                  data-c={c} title={c} onClick={() => setSelColor(c)} />
              ))}
            </div>
          </>}

          {product.sizes.length > 0 && <>
            <div className="pd-opt-label">Size <span style={{ textTransform: 'capitalize' }}>{selSize}</span></div>
            <div className="size-opts">
              {product.sizes.map(s => (
                <button key={s} className={`size-opt${selSize === s ? ' on' : ''}`}
                  onClick={() => setSelSize(s)} style={{ textTransform: 'capitalize' }}>{s}</button>
              ))}
            </div>
          </>}

          <div className="pd-opt-label">Quantity</div>
          <div className="pd-qty">
            <button className="pd-qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
            <input className="pd-qty-num" type="number" value={qty} min={1} readOnly />
            <button className="pd-qty-btn" onClick={() => setQty(q => q + 1)}>+</button>
          </div>

          <div className="pd-actions">
            <button className={`btn${adding ? ' btn-gold' : ' btn-dark'} btn-full`}
              style={{ height: 52, fontSize: 12 }} onClick={handleAdd} disabled={adding}>
              {adding ? '✓ Added to Bag!' : 'Add to Cart'}
            </button>
            <button className={`pd-wish-btn${wished ? ' liked' : ''}`}
              onClick={() => toggleWishlist(product.id)} aria-label="Add to wishlist">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
          </div>

          <ul className="pd-features">
            {product.features.map(f => (
              <li key={f}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {f}
              </li>
            ))}
          </ul>

          <div className="pd-accordion">
            <AccordionItem title="Full Description">
              <p className="pd-desc-text">{product.description}</p>
            </AccordionItem>
            <AccordionItem title="Specifications">
              <table className="pd-specs-table">
                <tbody>
                  {Object.entries(product.specs).map(([k, v]) => (
                    <tr key={k}><td>{k}</td><td>{v}</td></tr>
                  ))}
                </tbody>
              </table>
            </AccordionItem>
            <AccordionItem title="Shipping & Returns">
              <p className="pd-desc-text">
                Free standard shipping on orders over $150. All items can be returned within 30 days of delivery.
                See our <Link href="/contact" style={{ color: 'var(--gold)' }}>Returns Policy</Link> for full details.
              </p>
            </AccordionItem>
          </div>
        </div>
      </div>

      {/* ── REVIEWS ── */}
      <div style={{ marginTop: 60, borderTop: '1px solid #e8e3dc', paddingTop: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <h2 className="h2">Customer Reviews</h2>
          {!revSuccess && (
            <button className="btn btn-ghost" onClick={() => setShowReview(v => !v)}>
              {showReview ? 'Cancel' : 'Write a Review'}
            </button>
          )}
        </div>

        {revSuccess && (
          <div style={{ background: '#f0fff4', border: '1px solid #b7ebc7', borderRadius: 6,
            padding: '14px 18px', marginBottom: 24, color: '#276749' }}>
            Thanks for your review! It will appear after moderation.
          </div>
        )}

        {showReview && (
          <form onSubmit={submitReview} style={{ background: '#faf8f5', border: '1px solid #e8e3dc',
            borderRadius: 8, padding: 24, marginBottom: 32 }}>
            <h3 style={{ fontFamily: 'var(--serif)', marginBottom: 20 }}>Your Review</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 6 }}>Rating *</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => setRev(r => ({ ...r, rating: n }))}
                    style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer',
                      color: n <= rev.rating ? '#b8963e' : '#ddd' }}>★</button>
                ))}
              </div>
            </div>
            {!isAuthenticated && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="field-wrap">
                  <label className="field-label">Your Name *</label>
                  <input className="field-input" value={rev.guest_name} required
                    onChange={e => setRev(r => ({ ...r, guest_name: e.target.value }))} />
                </div>
                <div className="field-wrap">
                  <label className="field-label">Email</label>
                  <input className="field-input" type="email" value={rev.guest_email}
                    onChange={e => setRev(r => ({ ...r, guest_email: e.target.value }))} />
                </div>
              </div>
            )}
            <div className="field-wrap" style={{ marginBottom: 12 }}>
              <label className="field-label">Title</label>
              <input className="field-input" value={rev.title}
                onChange={e => setRev(r => ({ ...r, title: e.target.value }))} />
            </div>
            <div className="field-wrap" style={{ marginBottom: 16 }}>
              <label className="field-label">Review *</label>
              <textarea className="field-input" rows={4} required value={rev.body}
                onChange={e => setRev(r => ({ ...r, body: e.target.value }))}
                style={{ resize: 'vertical' }} />
            </div>
            <button className="btn btn-dark" type="submit" disabled={revLoading}>
              {revLoading ? 'Submitting…' : 'Submit Review'}
            </button>
          </form>
        )}

        {reviews.length === 0 ? (
          <p style={{ color: '#999', fontSize: 14 }}>No reviews yet — be the first!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {reviews.map(r => (
              <div key={r.id} style={{ borderBottom: '1px solid #e8e3dc', paddingBottom: 20 }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  {[1,2,3,4,5].map(i => (
                    <span key={i} style={{ color: i <= r.rating ? '#b8963e' : '#ddd', fontSize: 16 }}>★</span>
                  ))}
                  <span style={{ marginLeft: 8, fontSize: 13, color: '#888' }}>
                    {r.guest_name || 'Verified Customer'}
                  </span>
                </div>
                {r.title && <p style={{ fontWeight: 600, marginBottom: 4 }}>{r.title}</p>}
                <p style={{ color: '#555', fontSize: 14, lineHeight: 1.6 }}>{r.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── RELATED PRODUCTS ── */}
      {related.length > 0 && (
        <div className="related-section">
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <p className="overline">You may also like</p>
            <h2 className="h2" style={{ marginTop: 6 }}>Related Pieces</h2>
          </div>
          <div className="related-grid">
            {related.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}
    </div>
  )
}
