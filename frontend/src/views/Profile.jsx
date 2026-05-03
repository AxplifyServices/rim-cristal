'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { mapProduct } from '../lib/products'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

const STATUS_STYLE = {
  Delivered:  { background: '#e6f4ee', color: '#2e7d5a' },
  Shipped:    { background: '#e8f0fe', color: '#1a56db' },
  Processing: { background: '#fef3e2', color: '#b45309' },
  Cancelled:  { background: '#fde8e8', color: '#c0392b' },
  pending:    { background: '#fef3e2', color: '#b45309' },
  processing: { background: '#fef3e2', color: '#b45309' },
  shipped:    { background: '#e8f0fe', color: '#1a56db' },
  delivered:  { background: '#e6f4ee', color: '#2e7d5a' },
  cancelled:  { background: '#fde8e8', color: '#c0392b' },
}

const TABS = ['Orders', 'Wishlist', 'Settings']

function Stars({ rating }) {
  return (
    <div style={{ display: 'inline-flex', gap: 1, color: 'var(--gold)', fontSize: 12 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ opacity: i <= Math.round(rating) ? 1 : 0.2 }}>★</span>
      ))}
    </div>
  )
}

export default function Profile() {
  const { wishlist, toggleWishlist, addToCart } = useCart()
  const { user, isAuthenticated, loading: authLoading, updateUser, logout } = useAuth()
  const [tab, setTab]      = useState('Orders')
  const [expanded, setExp] = useState(null)
  const router             = useRouter()

  // Orders
  const [orders, setOrders]       = useState([])
  const [ordersLoading, setOL]    = useState(true)

  // Wishlist (API)
  const [wishlistItems, setWI]    = useState([])
  const [wlLoading, setWL]        = useState(false)

  // Settings form
  const [form, setForm] = useState({
    firstName: '', lastName: '',
    email: '', phone: '',
    newsletter: true, smsUpdates: false,
  })
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [saved, setSaved]     = useState(false)
  const [saveError, setSaveError] = useState('')

  // Populate form from auth context
  useEffect(() => {
    if (user) {
      setForm(f => ({
        ...f,
        firstName: user.first_name || '',
        lastName:  user.last_name  || '',
        email:     user.email      || '',
        phone:     user.phone      || '',
      }))
    }
  }, [user])

  // Redirect if not authenticated — wait for auth to finish loading first
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/profile')
    }
  }, [authLoading, isAuthenticated, router])

  // Fetch orders
  useEffect(() => {
    if (!isAuthenticated) return
    setOL(true)
    api.get(`/orders/my?user_id=${user.id}`)
      .then(data => setOrders(Array.isArray(data) ? data : (data.items || [])))
      .catch(() => setOrders([]))
      .finally(() => setOL(false))
  }, [isAuthenticated, user])

  useEffect(() => {
    if (tab !== 'Wishlist') return

    setWL(true)

    try {
      const stored = JSON.parse(localStorage.getItem('lux-wishlist') || '[]')

      if (!stored.length) {
        setWI([])
        return
      }

      Promise.all(
        stored.map(id =>
          fetch(`${API}/products/${id}`)
            .then(res => (res.ok ? res.json() : null))
            .catch(() => null)
        )
      )
        .then(products => {
          setWI(products.filter(Boolean).map(mapProduct))
        })
        .catch(() => setWI([]))
        .finally(() => setWL(false))
    } catch {
      setWI([])
      setWL(false)
    }
  }, [tab])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaveError('')
    try {
      const payload = {
        first_name: form.firstName,
        last_name:  form.lastName,
        email:      form.email,
        phone:      form.phone || null,
      }

      // Handle password change if filled
      if (pwForm.newPw) {
        if (pwForm.newPw !== pwForm.confirm) {
          setPwError('New passwords do not match')
          return
        }
        if (pwForm.newPw.length < 6) {
          setPwError('Password must be at least 6 characters')
          return
        }
        payload.password = pwForm.newPw
      }
      setPwError('')

      const updated = {
        ...user,
        first_name: payload.first_name,
        last_name: payload.last_name,
        email: payload.email,
        phone: payload.phone,
      }

      updateUser(updated)
      setSaved(true)
      setPwForm({ current: '', newPw: '', confirm: '' })
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setSaveError(err.message || 'Failed to save changes.')
    }
  }

  const handleRemoveWishlist = async (productId) => {
    // Remove from API wishlist
    try {
      await api.del(`/wishlist/${productId}`)
      setWI(prev => prev.filter(p => p.id !== productId))
    } catch {
      // fall back to local toggle
      toggleWishlist(productId)
      setWI(prev => prev.filter(p => p.id !== productId))
    }
  }

  // Show nothing while auth is resolving (prevents flash before redirect)
  if (authLoading) {
    return <div className="page-wrap" style={{ paddingTop: 80, textAlign: 'center', color: 'var(--text-3)' }}>Loading…</div>
  }

  const initials = user
    ? `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase() || '?'
    : '?'
  const displayName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : ''

  const formatDate = (d) => {
    try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
    catch { return d }
  }

  const statusLabel = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : 'Pending'

  return (
    <div className="page-wrap" style={{ paddingTop: 56, paddingBottom: 96 }}>

      {/* ── Profile header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 48, paddingBottom: 32, borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--gold-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontFamily: 'var(--serif)', fontWeight: 600, color: 'var(--gold)', flexShrink: 0 }}>
          {initials}
        </div>
        <div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.6rem,2.5vw,2rem)', fontWeight: 600, marginBottom: 4 }}>
            {displayName || 'My Account'}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)' }}>{user?.email}</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <Link href="/shop" className="btn btn-ghost" style={{ fontSize: '11px', padding: '10px 20px' }}>Shop</Link>
          <button className="btn btn-dark" style={{ fontSize: '11px', padding: '10px 20px' }} onClick={() => setTab('Settings')}>
            Edit Profile
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 40 }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '12px 28px', fontSize: '12px', fontWeight: 600,
              letterSpacing: '.08em', textTransform: 'uppercase', background: 'none',
              border: 'none', borderBottom: tab === t ? '2px solid var(--black)' : '2px solid transparent',
              color: tab === t ? 'var(--black)' : 'var(--text-3)',
              marginBottom: -1, cursor: 'pointer', transition: 'all .2s',
            }}
          >
            {t}
            {t === 'Orders' && orders.length > 0 && (
              <span style={{ marginLeft: 7, background: 'var(--gold)', color: 'white', fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: 20 }}>
                {orders.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── ORDERS ── */}
      {tab === 'Orders' && (
        <div>
          {ordersLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>Loading orders…</div>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginBottom: 20 }}>No orders yet.</p>
              <button className="btn btn-dark" onClick={() => router.push('/shop')}>Start Shopping</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {orders.map(order => {
                const status = statusLabel(order.status)
                const styleKey = status in STATUS_STYLE ? status : order.status
                return (
                  <div key={order.id} style={{ border: '1px solid var(--border)', background: 'white' }}>
                    <div
                      onClick={() => setExp(expanded === order.id ? null : order.id)}
                      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 20, padding: '20px 24px', alignItems: 'center', cursor: 'pointer' }}
                    >
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 4 }}>Order</div>
                        <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--serif)' }}>{order.order_number}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 4 }}>Date</div>
                        <div style={{ fontSize: 13.5 }}>{formatDate(order.created_at)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 4 }}>Status</div>
                        <span style={{ fontSize: 11.5, fontWeight: 600, padding: '3px 10px', ...(STATUS_STYLE[styleKey] || STATUS_STYLE['Processing']) }}>
                          {status}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 4 }}>Total</div>
                        <div style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 600 }}>
                          ${Number(order.total || 0).toFixed(2)}                        </div>
                      </div>
                    </div>

                    {expanded === order.id && (
                      <div style={{ borderTop: '1px solid var(--border)', padding: '20px 24px', background: 'var(--bg-alt)' }}>
                        {(order.items || []).map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: 16, paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid var(--border-lt)', alignItems: 'center' }}>
                            {item.product_image && (
                              <img src={item.product_image} alt={item.product_name} style={{ width: 52, height: 64, objectFit: 'cover', background: 'var(--bg)', flexShrink: 0 }} />
                            )}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontFamily: 'var(--serif)', fontSize: 14.5, fontWeight: 600, marginBottom: 3 }}>{item.product_name}</div>
                              {(item.selected_color || item.selected_size) && (
                                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                                  {[item.selected_color, item.selected_size].filter(Boolean).join(' · ')}
                                </div>
                              )}
                              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Qty: {item.quantity}</div>
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>
                              ${(parseFloat(item.unit_price || 0) * (item.quantity || 1)).toFixed(2)}
                            </div>
                          </div>
                        ))}
                        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                          <Link href={`/track?order=${order.order_number}`} className="btn btn-ghost" style={{ fontSize: '10.5px', padding: '9px 18px' }}>Track Order</Link>
                          {order.status === 'delivered' && (
                            <button className="btn btn-ghost" style={{ fontSize: '10.5px', padding: '9px 18px' }}>Return Item</button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── WISHLIST ── */}
      {tab === 'Wishlist' && (
        <div>
          {wlLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>Loading wishlist…</div>
          ) : wishlistItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 40, marginBottom: 16, opacity: .25 }}>♡</div>
              <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginBottom: 20 }}>
                No saved items yet. Heart any product to save it here.
              </p>
              <button className="btn btn-dark" onClick={() => router.push('/shop')}>Browse Products</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
              {wishlistItems.map(p => (
                <div key={p.id} style={{ background: 'white', border: '1px solid var(--border)' }}>
                  <div
                    style={{ position: 'relative', aspectRatio: '3/4', overflow: 'hidden', background: 'var(--bg)', cursor: 'pointer' }}
                    onClick={() => router.push(`/product/${p.slug}`)}
                  >
                    {p.images?.[0] && <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    <button
                      onClick={e => { e.stopPropagation(); handleRemoveWishlist(p.id) }}
                      style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: '50%', background: 'white', border: 'none', cursor: 'pointer', fontSize: 16, color: '#d94f4f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      aria-label="Remove from wishlist"
                    >♥</button>
                  </div>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 4 }}>{p.categoryLabel}</div>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 600, marginBottom: 6, lineHeight: 1.2 }}>{p.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                      <Stars rating={p.rating} />
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>({p.reviews})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 16, fontWeight: 600 }}>${p.salePrice.toFixed(2)}</span>
                      {p.originalPrice !== p.salePrice && (
                        <span style={{ fontSize: 12, color: 'var(--text-3)', textDecoration: 'line-through' }}>${p.originalPrice.toFixed(2)}</span>
                      )}
                    </div>
                    <button
                      className="btn btn-dark"
                      style={{ width: '100%', padding: '10px', fontSize: '10.5px' }}
                      onClick={() => { addToCart(p, 1, p.colors?.[0], p.sizes?.[0]); router.push('/cart') }}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SETTINGS ── */}
      {tab === 'Settings' && (
        <div style={{ maxWidth: 640 }}>
          <form onSubmit={handleSave}>
            <div style={{ marginBottom: 36 }}>
              <h3 style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 600, marginBottom: 22 }}>Personal Information</h3>
              <div className="form-grid">
                <div className="field-wrap">
                  <label className="field-label" htmlFor="prof-fn">First Name</label>
                  <input id="prof-fn" className="field-input" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
                </div>
                <div className="field-wrap">
                  <label className="field-label" htmlFor="prof-ln">Last Name</label>
                  <input id="prof-ln" className="field-input" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
                </div>
                <div className="field-wrap" style={{ gridColumn: '1/-1' }}>
                  <label className="field-label" htmlFor="prof-email">Email Address</label>
                  <input id="prof-email" type="email" className="field-input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="field-wrap" style={{ gridColumn: '1/-1' }}>
                  <label className="field-label" htmlFor="prof-phone">Phone Number</label>
                  <input id="prof-phone" type="tel" className="field-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 36, paddingTop: 28, borderTop: '1px solid var(--border)' }}>
              <h3 style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 600, marginBottom: 22 }}>Change Password</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="field-wrap">
                  <label className="field-label" htmlFor="prof-pw-new">New Password</label>
                  <input id="prof-pw-new" type="password" className="field-input" placeholder="Leave blank to keep current" value={pwForm.newPw} onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))} />
                </div>
                <div className="field-wrap">
                  <label className="field-label" htmlFor="prof-pw-conf">Confirm New Password</label>
                  <input id="prof-pw-conf" type="password" className="field-input" placeholder="••••••••" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
                </div>
                {pwError && <p style={{ fontSize: 12, color: 'var(--danger)', margin: 0 }}>{pwError}</p>}
              </div>
            </div>

            <div style={{ marginBottom: 36, paddingTop: 28, borderTop: '1px solid var(--border)' }}>
              <h3 style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 600, marginBottom: 22 }}>Notifications</h3>
              {[
                { key: 'newsletter', label: 'Email Newsletter',   desc: 'New arrivals, design inspiration and member offers' },
                { key: 'smsUpdates', label: 'SMS Order Updates',  desc: 'Shipping and delivery notifications via text' },
              ].map(({ key, label, desc }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border-lt)' }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>{label}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>{desc}</div>
                  </div>
                  <label style={{ position: 'relative', width: 40, height: 22, flexShrink: 0, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                      style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                    />
                    <span style={{ position: 'absolute', inset: 0, background: form[key] ? 'var(--gold)' : '#ddd', borderRadius: 22, transition: '.25s' }}>
                      <span style={{ position: 'absolute', height: 16, width: 16, left: form[key] ? 21 : 3, bottom: 3, background: 'white', borderRadius: '50%', transition: '.25s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                    </span>
                  </label>
                </div>
              ))}
            </div>

            {saveError && <p style={{ fontSize: 12.5, color: 'var(--danger)', marginBottom: 12 }}>{saveError}</p>}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button type="submit" className="btn btn-dark">
                {saved ? '✓ Saved' : 'Save Changes'}
              </button>
              {saved && <span style={{ fontSize: 12.5, color: 'var(--success)' }}>Profile updated successfully.</span>}
              <button type="button" className="btn btn-ghost" style={{ marginLeft: 'auto', fontSize: 11 }} onClick={logout}>
                Sign Out
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
