'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { products, categories, testimonials } from '../data/products'
import ProductCard from '../components/ProductCard'

const FEATURED = products.filter(p => p.featured).slice(0, 4)

const VALUES = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/>
        <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ),
    title: 'Free Shipping',
    desc: 'On all orders over $150. Tracked delivery with white-glove packaging.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    ),
    title: '30-Day Returns',
    desc: 'Changed your mind? Return anything within 30 days for a full refund.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <polyline points="9 12 11 14 15 10"/>
      </svg>
    ),
    title: '2-Year Warranty',
    desc: 'Every fixture fully covered. Your investment, protected.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    title: 'Expert Support',
    desc: 'Lighting specialists on hand Mon–Fri to find the perfect piece for your space.',
  },
]

function Stars({ rating }) {
  return (
    <div className="stars">
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ opacity: i <= Math.round(rating) ? 1 : 0.25 }}>★</span>
      ))}
    </div>
  )
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export default function Home() {
  const [email, setEmail]           = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [subLoading, setSubLoading] = useState(false)
  const router = useRouter()

  const handleImgError = e => {
    e.currentTarget.style.display = 'none'
  }

  const handleNewsletter = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubLoading(true)
    try {
      await fetch(`${API}/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
    } catch { /* fail silently — still show success UI */ }
    finally {
      setSubscribed(true)
      setSubLoading(false)
    }
  }

  return (
    <>
      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-bg">
        <img
          src="/placeholder-product.svg"
          alt="Lux Lumina hero"
          onError={handleImgError}
        />
        </div>
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="hero-pre">New Collection 2026</p>
          <h1 className="hero-title">
            Light that<br />transforms space
          </h1>
          <p className="hero-sub">
            Curated decorative lighting for modern interiors — where craftsmanship meets contemporary design.
          </p>
          <div className="hero-actions">
            <button className="btn btn-gold" onClick={() => router.push('/shop')}>
              Shop Collection
            </button>
            <button className="btn btn-outline" style={{ color: 'white', borderColor: 'rgba(255,255,255,.5)' }} onClick={() => router.push('/about')}>
              Our Story
            </button>
          </div>
        </div>
      </section>

      {/* ── CATEGORY GRID ── */}
      <div className="cat-section">
        <div className="page-wrap cat-section-head">
          <p className="overline">Browse by Category</p>
        </div>
        <div className="cat-grid">
          {categories.map(cat => (
            <div
              key={cat.id}
              className="cat-tile"
              onClick={() => router.push(`/shop/${cat.id}`)}
            >
              <img
                src={cat.image}
                alt={cat.label}
                loading="lazy"
                onError={handleImgError}
              />
              <div className="cat-tile-label">
                {cat.label}
                <div className="cat-tile-count">{cat.count > 0 ? `${cat.count} styles` : 'Coming soon'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURED PRODUCTS ── */}
      <section className="section page-wrap">
        <div className="featured-header">
          <div>
            <p className="overline">Editor's Picks</p>
            <h2 className="h2" style={{ marginTop: 6 }}>Featured Pieces</h2>
          </div>
          <Link href="/shop" className="btn btn-ghost">View All →</Link>
        </div>
        <div className="featured-grid">
          {FEATURED.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* ── VALUES STRIP ── */}
      <div className="values-strip">
        <div className="values-grid page-wrap">
          {VALUES.map(v => (
            <div key={v.title} className="value-item">
              <div className="value-icon">{v.icon}</div>
              <div className="value-title">{v.title}</div>
              <div className="value-desc">{v.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── BRAND BANNER ── */}
      <section style={{ position: 'relative', height: 360, overflow: 'hidden' }}>
        <img
          src="/placeholder-product.svg"
          alt="Lux Lumina brand"
          onError={handleImgError}
          style={{ height: '100%', objectFit: 'cover', filter: 'brightness(.62)', width: '100%' }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to right, rgba(10,8,6,.7) 0%, rgba(10,8,6,.2) 60%)',
          display: 'flex', alignItems: 'center',
        }}>
          <div className="page-wrap" style={{ color: 'white', width: '100%' }}>
            <p className="overline" style={{ color: 'var(--gold-lt)', marginBottom: 12 }}>About Lux Lumina</p>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.8rem, 3vw, 2.8rem)', fontWeight: 600, maxWidth: 520, lineHeight: 1.2, marginBottom: 18 }}>
              Lighting designed to become part of your story
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,.65)', maxWidth: 440, lineHeight: 1.75, marginBottom: 28 }}>
              Founded in 2018, we work with artisans across Europe and Asia to bring you fixtures that blur the line between art and function.
            </p>
            <Link href="/about" className="btn btn-outline" style={{ color: 'white', borderColor: 'rgba(255,255,255,.5)' }}>
              Our Story →
            </Link>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="section testimonials-bg">
        <div className="page-wrap">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p className="overline">Customer Reviews</p>
            <h2 className="h2" style={{ marginTop: 6 }}>What our customers say</h2>
          </div>
          <div className="testi-grid">
            {testimonials.map(t => (
              <div key={t.id} className="testi-card">
                <div className="testi-quote">"</div>
                <div className="testi-text">{t.text}</div>
                <div className="testi-product">{t.product}</div>
                <Stars rating={t.rating} />
                <div className="testi-author" style={{ marginTop: 14 }}>
                  <div className="testi-avatar testi-avatar-initials">
                    {t.initials || t.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="testi-name">{t.name}</div>
                    <div className="testi-loc">{t.location}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NEWSLETTER ── */}
      <div className="newsletter-section">
        <div className="newsletter-inner">
          {!subscribed ? (
            <>
              <p className="overline" style={{ color: 'var(--gold)', marginBottom: 14 }}>Stay Inspired</p>
              <h2>Join the Lux Lumina Circle</h2>
              <p>Get exclusive early access to new arrivals, design inspiration, and member-only offers — delivered to your inbox.</p>
              <form className="newsletter-form" onSubmit={handleNewsletter}>
                <input
                  type="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-gold" disabled={subLoading}>{subLoading ? 'Subscribing…' : 'Subscribe'}</button>
              </form>
            </>
          ) : (
            <div style={{ color: 'white' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✦</div>
              <h2 style={{ fontFamily: 'var(--serif)', color: 'white', marginBottom: 10 }}>You're on the list!</h2>
              <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 14 }}>
                Welcome to the Lux Lumina Circle. Expect beautiful things in your inbox.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
