'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

const STATUS_STEPS = ['pending', 'processing', 'shipped', 'delivered']

const STATUS_INFO = {
  pending:    { label: 'Order Confirmed',       color: '#b45309', bg: '#fef3e2' },
  processing: { label: 'Processing & Packing',  color: '#1a56db', bg: '#e8f0fe' },
  shipped:    { label: 'Shipped',               color: '#7c3aed', bg: '#ede9fe' },
  delivered:  { label: 'Delivered',             color: '#2e7d5a', bg: '#e6f4ee' },
  cancelled:  { label: 'Cancelled',             color: '#c0392b', bg: '#fde8e8' },
}

function StatusBadge({ status }) {
  const info = STATUS_INFO[status?.toLowerCase()] || STATUS_INFO.pending
  return (
    <span style={{ background: info.bg, color: info.color, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
      {info.label}
    </span>
  )
}

function DeliveryTimeline({ status }) {
  const current = STATUS_STEPS.indexOf(status?.toLowerCase())
  if (status?.toLowerCase() === 'cancelled') {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--danger)', fontSize: 14 }}>
        This order has been cancelled.
      </div>
    )
  }
  return (
    <div className="delivery-steps" style={{ margin: '32px 0' }}>
      {[
        { label: 'Order Confirmed',      sub: 'Your order was placed successfully' },
        { label: 'Processing & Packing', sub: '1–2 business days' },
        { label: 'Shipped',              sub: 'On its way to you' },
        { label: 'Delivered',            sub: '3–5 business days total' },
      ].map((step, i) => (
        <div key={step.label} className="delivery-step">
          <div className={`delivery-dot${i <= current ? ' active' : ''}`}>
            {i <= current ? '✓' : i + 1}
          </div>
          <div className="delivery-label" style={{ fontWeight: i === current ? 700 : 500 }}>{step.label}</div>
          <div className="delivery-sub">{step.sub}</div>
        </div>
      ))}
    </div>
  )
}

export default function TrackOrder() {
  const searchParams = useSearchParams()
  const [input, setInput]   = useState(searchParams.get('order') || '')
  const [order, setOrder]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  // Auto-search if ?order= param is present
  useEffect(() => {
    const orderParam = searchParams.get('order')
    if (orderParam) {
      setInput(orderParam)
      doSearch(orderParam)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const doSearch = async (num) => {
    const q = (num || input).trim().toUpperCase()
    if (!q) { setError('Please enter an order number.'); return }
    setLoading(true)
    setError('')
    setOrder(null)
    try {
      const res = await fetch(`${API}/orders/track/${encodeURIComponent(q)}`)
      if (res.status === 404) { setError(`No order found for "${q}". Please check the number and try again.`); return }
      if (!res.ok) throw new Error('Failed to fetch order.')
      const data = await res.json()
      setOrder(data)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    doSearch()
  }

  const formatDate = (d) => {
    try { return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) }
    catch { return d }
  }

  return (
    <div className="page-wrap" style={{ paddingTop: 56, paddingBottom: 96, maxWidth: 760 }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 48 }}>
        <p className="overline" style={{ color: 'var(--gold)', marginBottom: 10 }}>Real-time updates</p>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 600, marginBottom: 12 }}>
          Track Your Order
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.7 }}>
          Enter your order number (e.g. <code style={{ background: 'var(--bg-alt)', padding: '1px 6px', fontSize: 13 }}>LX-48291</code>) to see the latest status and delivery estimate.
        </p>
      </div>

      {/* ── Search form ── */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, marginBottom: 40 }}>
        <input
          type="text"
          className="field-input"
          placeholder="Order number (LX-XXXXX)"
          value={input}
          onChange={e => { setInput(e.target.value.toUpperCase()); setError('') }}
          style={{ flex: 1, textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 600 }}
        />
        <button type="submit" className="btn btn-dark" style={{ flexShrink: 0, padding: '0 28px' }} disabled={loading}>
          {loading ? 'Searching…' : 'Track →'}
        </button>
      </form>

      {/* ── Error ── */}
      {error && (
        <div style={{ background: '#fff0f0', border: '1px solid #ffc5c5', padding: '14px 18px', borderRadius: 6, color: '#c0392b', fontSize: 14, marginBottom: 32 }}>
          {error}
        </div>
      )}

      {/* ── Result ── */}
      {order && (
        <div>
          {/* Order header card */}
          <div style={{ border: '1px solid var(--border)', padding: '24px 28px', marginBottom: 28, background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>Order Number</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 600, marginBottom: 8 }}>{order.order_number}</div>
                <StatusBadge status={order.status} />
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 4 }}>Placed on</div>
                <div style={{ fontSize: 14 }}>{formatDate(order.created_at)}</div>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 4, marginTop: 12 }}>Order Total</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 700 }}>${parseFloat(order.total || order.total_amount || 0).toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Delivery timeline */}
          <div style={{ border: '1px solid var(--border)', padding: '24px 28px', marginBottom: 28, background: 'white' }}>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Delivery Status</h3>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 0 }}>Standard delivery: 3–5 business days</p>
            <DeliveryTimeline status={order.status} />
          </div>

          {/* Items */}
          {order.items?.length > 0 && (
            <div style={{ border: '1px solid var(--border)', padding: '24px 28px', marginBottom: 28, background: 'white' }}>
              <h3 style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Items Ordered</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {order.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 16, alignItems: 'center', paddingBottom: 16, borderBottom: idx < order.items.length - 1 ? '1px solid var(--border-lt)' : 'none' }}>
                    {item.product_image && (
                      <img src={item.product_image} alt={item.product_name} style={{ width: 56, height: 68, objectFit: 'cover', background: 'var(--bg-alt)', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{item.product_name}</div>
                      {(item.selected_color || item.selected_size) && (
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 2 }}>
                          {[item.selected_color, item.selected_size].filter(Boolean).join(' · ')}
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Qty: {item.quantity}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                      ${(parseFloat(item.unit_price || 0) * (item.quantity || 1)).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Order totals */}
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 8 }}>
                  <span style={{ color: 'var(--text-2)' }}>Subtotal</span>
                  <span>${parseFloat(order.subtotal || 0).toFixed(2)}</span>
                </div>
                {parseFloat(order.discount_amount || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 8, color: 'var(--success)' }}>
                    <span>Discount {order.coupon_code ? `(${order.coupon_code})` : ''}</span>
                    <span>-${parseFloat(order.discount_amount).toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 12 }}>
                  <span style={{ color: 'var(--text-2)' }}>Shipping</span>
                  <span>{parseFloat(order.shipping_cost || 0) === 0 ? 'FREE' : `$${parseFloat(order.shipping_cost).toFixed(2)}`}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, fontFamily: 'var(--serif)' }}>
                  <span>Total</span>
                  <span>${parseFloat(order.total || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Shipping address */}
          <div style={{ border: '1px solid var(--border)', padding: '24px 28px', background: 'white' }}>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Shipping Address</h3>
            <address style={{ fontStyle: 'normal', lineHeight: 1.8, fontSize: 14, color: 'var(--text-2)' }}>
              <strong style={{ color: 'var(--text-1)' }}>{order.shipping_first_name} {order.shipping_last_name}</strong><br />
              {order.shipping_address}{order.shipping_apt ? `, ${order.shipping_apt}` : ''}<br />
              {order.shipping_city}{order.shipping_state ? `, ${order.shipping_state}` : ''} {order.shipping_zip}<br />
              {order.shipping_country}
            </address>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
            <Link href="/shop" className="btn btn-dark">Continue Shopping</Link>
            <Link href="/contact" className="btn btn-ghost">Need Help?</Link>
          </div>
        </div>
      )}

      {/* ── Empty state (no search yet) ── */}
      {!order && !error && !loading && !searchParams.get('order') && (
        <div style={{ textAlign: 'center', padding: '48px 24px', border: '1px solid var(--border)', background: 'var(--bg-alt)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: 48, height: 48, strokeWidth: 1, opacity: .3, margin: '0 auto 20px', display: 'block' }}>
            <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
          <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 6 }}>Enter your order number above to see real-time delivery updates.</p>
          <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Your order number was emailed to you after purchase — check the confirmation email.</p>
        </div>
      )}
    </div>
  )
}
