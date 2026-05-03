'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart } from '../context/CartContext'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

export default function Cart() {
  const { items, removeFromCart, setQty, subtotal, isFreeShip, shippingDiff, shipPct } = useCart()
  const [coupon, setCoupon]           = useState('')
  const [couponApplied, setCouponApplied] = useState(false)
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponCode, setCouponCode]   = useState('')
  const [couponError, setCouponError] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const router = useRouter()

  const discount = couponApplied ? couponDiscount : 0
  const shipping = isFreeShip ? 0 : (subtotal > 0 ? 12.95 : 0)
  const total    = Math.max(0, subtotal - discount + shipping)

  const applyCoupon = async () => {
    if (!coupon.trim()) return
    setCouponLoading(true)
    setCouponError('')
    try {
      const res = await fetch(`${API}/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: coupon.trim(), order_amount: subtotal }),
      })
      const data = await res.json()
      if (data.valid) {
        setCouponApplied(true)
        setCouponDiscount(data.discount_amount)
        setCouponCode(data.code)
      } else {
        setCouponError(data.message || 'Invalid coupon code.')
        setCouponApplied(false)
      }
    } catch {
      setCouponError('Could not validate coupon. Try again.')
    } finally {
      setCouponLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="page-wrap cart-page">
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: 56, height: 56, strokeWidth: 1, opacity: .35, margin: '0 auto 20px' }}>
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 28, marginBottom: 10 }}>Your bag is empty</h2>
          <p style={{ color: 'var(--text-2)', marginBottom: 28 }}>Looks like you haven't added anything yet.</p>
          <button className="btn btn-dark" onClick={() => router.push('/shop')}>Discover Lighting</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-wrap cart-page">
      <h1>Shopping Bag</h1>
      <p className="cart-page-sub">{items.length} {items.length === 1 ? 'item' : 'items'} in your bag</p>

      <div className="cart-page-grid">
        {/* Items */}
        <div>
          {/* Free shipping bar */}
          <div style={{ background: 'var(--bg-alt)', border: '1px solid var(--border)', padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14, fontSize: 13 }}>
            <span style={{ flexShrink: 0 }}>
              {isFreeShip ? '🎉 You have free shipping!' : `$${shippingDiff.toFixed(2)} away from free shipping`}
            </span>
            <div style={{ flex: 1, height: 3, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${shipPct}%`, background: 'var(--gold)', transition: 'width .5s ease' }} />
            </div>
          </div>

          <div className="cart-items-list">
            {items.map(item => {
              const lineTotal = (item.salePrice * item.qty).toFixed(2)
              return (
                <div key={item.lineKey} className="cart-page-line">
                  <img className="cp-img" src={item.images[0]} alt={item.name} />
                  <div className="cp-info">
                    <div className="cp-cat">{item.categoryLabel}</div>
                    <div className="cp-name">{item.name}</div>
                    <div className="cp-meta">{item.selectedColor} · {item.selectedSize}</div>
                    <div className="cp-price">${item.salePrice.toFixed(2)}</div>
                    <div className="cp-actions">
                      <div className="cp-qty">
                        <button className="cp-qty-btn" onClick={() => setQty(item.lineKey, item.qty - 1)}>−</button>
                        <span className="cp-qty-num">{item.qty}</span>
                        <button className="cp-qty-btn" onClick={() => setQty(item.lineKey, item.qty + 1)}>+</button>
                      </div>
                      <span className="cp-remove" onClick={() => removeFromCart(item.lineKey)}>Remove</span>
                    </div>
                  </div>
                  <div className="cp-subtotal">${lineTotal}</div>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <Link href="/shop" className="btn btn-ghost">← Continue Shopping</Link>
          </div>
        </div>

        {/* Order summary */}
        <div className="order-summary">
          <div className="os-title">Order Summary</div>

          <div className="os-row">
            <span>Subtotal ({items.reduce((s, i) => s + i.qty, 0)} items)</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          {couponApplied && (
            <div className="os-row" style={{ color: 'var(--success)' }}>
              <span>Coupon ({couponCode})</span>
              <span>-${discount.toFixed(2)}</span>
            </div>
          )}
          <div className="os-row">
            <span>Shipping</span>
            <span>{shipping === 0 && subtotal > 0 ? 'FREE' : shipping > 0 ? `$${shipping.toFixed(2)}` : '—'}</span>
          </div>

          <div className="coupon-form">
            <input
              type="text"
              placeholder="Coupon code"
              value={coupon}
              onChange={e => { setCoupon(e.target.value); setCouponError(''); }}
            />
            <button className="btn btn-dark" onClick={applyCoupon}>Apply</button>
          </div>
          {couponError && <p style={{ fontSize: 11.5, color: 'var(--danger)', marginTop: -6, marginBottom: 12 }}>{couponError}</p>}
          {couponApplied && <p style={{ fontSize: 11.5, color: 'var(--success)', marginTop: -6, marginBottom: 12 }}>✓ ${discount.toFixed(2)} discount applied!</p>}

          <div className="os-row os-total">
            <span style={{ fontWeight: 600 }}>Total</span>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 700 }}>${total.toFixed(2)}</span>
          </div>

          <button className="btn btn-dark btn-full" style={{ marginTop: 20 }} onClick={() => router.push('/checkout')}>
            Proceed to Checkout →
          </button>

          <div style={{ marginTop: 20, padding: '14px 0', borderTop: '1px solid var(--border-lt)' }}>
            <p style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', marginBottom: 12 }}>We accept</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              {['VISA','MC','AMEX','PAYPAL','APPLE PAY'].map(c => (
                <span key={c} style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '3px 8px', fontSize: 9.5, fontWeight: 700, color: 'var(--text-2)' }}>{c}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
