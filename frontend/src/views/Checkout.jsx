'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

const STEPS = ['Shipping', 'Payment', 'Confirmation']

const GUEST_SHIP_KEY = 'lux-guest-ship'

// Field component MUST live outside Checkout so React never re-mounts it on keystrokes
function Field({ label, id, value, onChange, placeholder, type = 'text', required, errors = {} }) {
  return (
    <div className="field-wrap">
      <label className="field-label" htmlFor={id}>
        {label}{required && ' *'}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`field-input${errors[id] ? ' error' : ''}`}
        autoComplete="on"
      />
      {errors[id] && <span className="field-error">{errors[id]}</span>}
    </div>
  )
}

function StepIndicator({ current }) {
  return (
    <div className="step-indicator">
      {STEPS.map((s, i) => (
        <div key={s} style={{ display: 'contents' }}>
          <div className={`step${i < current ? ' done' : i === current ? ' active' : ''}`}>
            <div className="step-num">
              {i < current ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  style={{ width: 13, height: 13, strokeWidth: 2.5 }}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : i + 1}
            </div>
            <span>{s}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`step-line${i < current ? ' done' : ''}`} />
          )}
        </div>
      ))}
    </div>
  )
}

const INIT_SHIP = {
  firstName: '', lastName: '', email: '', phone: '',
  address: '', apt: '', city: '', state: '', zip: '',
  country: 'United States',
}
const INIT_PAY = { method: 'card', cardNum: '', expiry: '', cvv: '', cardName: '' }

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

// ── helpers ──────────────────────────────────────────────
function saveGuestShip(ship) {
  try { localStorage.setItem(GUEST_SHIP_KEY, JSON.stringify(ship)) } catch {}
}

function loadGuestShip() {
  try { return JSON.parse(localStorage.getItem(GUEST_SHIP_KEY) || 'null') } catch { return null }
}

function userToShip(user) {
  return {
    firstName: user.first_name || '',
    lastName:  user.last_name  || '',
    email:     user.email      || '',
    phone:     user.phone      || '',
    address: '', apt: '', city: '', state: '', zip: '',
    country: 'United States',
  }
}

function addressToShip(addr, email = '', phone = '') {
  return {
    firstName: addr.first_name || '',
    lastName:  addr.last_name  || '',
    email,
    phone:     addr.phone || phone || '',
    address:   addr.address || '',
    apt:       addr.apt || '',
    city:      addr.city || '',
    state:     addr.state || '',
    zip:       addr.zip || '',
    country:   addr.country || 'United States',
  }
}
// ─────────────────────────────────────────────────────────

export default function Checkout() {
  const { items, subtotal, isFreeShip, clearCart } = useCart()
  const { user, isAuthenticated }                  = useAuth()

  const [step, setStep]               = useState(0)
  const [ship, setShip]               = useState(INIT_SHIP)
  const [pay, setPay]                 = useState(INIT_PAY)
  const [errors, setErr]              = useState({})
  const [orderNumber, setOrderNumber] = useState(null)
  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const router                        = useRouter()

  // Saved addresses (authenticated users)
  const [addresses, setAddresses]     = useState([])
  const [addrLoaded, setAddrLoaded]   = useState(false)

  // Banner state
  const [autofillBanner, setAutofillBanner] = useState(false)  // guest remembered banner
  const [filledFrom, setFilledFrom]         = useState(null)   // 'profile' | 'address' | 'guest' | null

  const shipping = isFreeShip ? 0 : 12.95
  const total    = subtotal + shipping

  // ── On mount: pre-fill shipping ──────────────────────
  useEffect(() => {
    if (isAuthenticated && user) {
      // 1. Fill basic profile info (name, email, phone)
      const profileFill = userToShip(user)

      // 2. Try to find a default saved address to merge in address fields
      api.get('/addresses')
        .then(data => {
          const addrs = Array.isArray(data) ? data : (data.items || [])
          setAddresses(addrs)
          setAddrLoaded(true)

          const def = addrs.find(a => a.is_default) || addrs[0]
          if (def) {
            // Merge: address fields from saved address, contact from profile
            setShip(addressToShip(def, user.email, user.phone))
            setFilledFrom('address')
          } else {
            // No saved address — just fill name / email / phone
            setShip(profileFill)
            setFilledFrom('profile')
          }
        })
        .catch(() => {
          setAddrLoaded(true)
          setShip(profileFill)
          setFilledFrom('profile')
        })
    } else {
      // Guest — restore from last checkout if available
      const saved = loadGuestShip()
      if (saved && saved.email) {
        setShip(saved)
        setFilledFrom('guest')
        setAutofillBanner(true)
      }
    }
  }, [isAuthenticated, user]) // eslint-disable-line react-hooks/exhaustive-deps

  const updShip = (k, v) => setShip(s => ({ ...s, [k]: v }))
  const updPay  = (k, v) => setPay(p => ({ ...p, [k]: v }))

  // ── Fill from a specific address ──────────────────────
  const applyAddress = (addr) => {
    setShip(addressToShip(addr, user?.email || ship.email, user?.phone || ship.phone))
    setFilledFrom('address')
  }

  // ── Fill from profile (name + email only, clear address) ──
  const applyProfile = () => {
    setShip(s => ({
      ...s,
      firstName: user?.first_name || s.firstName,
      lastName:  user?.last_name  || s.lastName,
      email:     user?.email      || s.email,
      phone:     user?.phone      || s.phone,
    }))
    setFilledFrom('profile')
  }

  // ── Validation ────────────────────────────────────────
  const validateShipping = () => {
    const e = {}
    if (!ship.firstName.trim())             e.firstName = 'Required'
    if (!ship.lastName.trim())              e.lastName  = 'Required'
    if (!ship.email.match(/.+@.+\..+/))    e.email     = 'Valid email required'
    if (!ship.address.trim())              e.address   = 'Required'
    if (!ship.city.trim())                 e.city      = 'Required'
    if (!ship.zip.trim())                  e.zip       = 'Required'
    setErr(e)
    return Object.keys(e).length === 0
  }

  const validatePayment = () => {
    if (pay.method !== 'card') return true
    const e = {}
    if (!pay.cardNum.replace(/\s/g, '').match(/^\d{16}$/)) e.cardNum  = 'Valid 16-digit card number required'
    if (!pay.expiry.match(/^\d{2}\/\d{2}$/))               e.expiry   = 'Use MM/YY format'
    if (!pay.cvv.match(/^\d{3,4}$/))                       e.cvv      = '3–4 digits required'
    if (!pay.cardName.trim())                              e.cardName = 'Required'
    setErr(e)
    return Object.keys(e).length === 0
  }

  // ── Step progression ─────────────────────────────────
  const nextStep = async () => {
    setErr({})
    setSubmitError(null)
    if (step === 0 && !validateShipping()) return
    if (step === 1) {
      if (!validatePayment()) return
      setSubmitting(true)
      try {
        
    const payload = {
      user_id: user?.id || null,

      subtotal,
      shipping_cost: shipping,
      discount_amount: 0,
      total,

      first_name: ship.firstName,
      last_name: ship.lastName,
      email: ship.email,
      phone: ship.phone || null,
      address: ship.address,
      apt: ship.apt || null,
      city: ship.city,
      state: ship.state || null,
      zip: ship.zip,
      country: ship.country || 'Morocco',

      payment_method: pay.method,
      notes: null,

      items: items.map(i => ({
        product_id: i.id,
        product_name: i.name,
        product_reference: i.reference || null,
        product_image: i.images?.[0] || null,
        selected_color: i.selectedColor || null,
        selected_size: i.selectedSize || null,
        unit_price: Number(i.salePrice || 0),
        quantity: Number(i.qty || 1),
        line_total: Number(i.salePrice || 0) * Number(i.qty || 1),
      })),
    }

const order = await api.post('/orders/checkout', payload)

        setOrderNumber(order.order_number)

        // Save guest shipping data for next time
        if (!isAuthenticated) {
          saveGuestShip(ship)
        }

        clearCart()
        setStep(s => s + 1)
      } catch (err) {
        setSubmitError(err.message)
      } finally {
        setSubmitting(false)
      }
      return
    }
    setStep(s => s + 1)
  }

  if (items.length === 0 && step < 2) {
    return (
      <div className="page-wrap checkout-page" style={{ textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 26, marginBottom: 14 }}>Your bag is empty</h2>
        <button className="btn btn-dark" onClick={() => router.push('/shop')}>Back to Shop</button>
      </div>
    )
  }

  return (
    <div className="page-wrap checkout-page">
      {/* Page heading */}
      <div className="checkout-page-head">
        <Link href="/cart" className="checkout-back">← Back to Cart</Link>
        <h1 className="checkout-title">Checkout</h1>
      </div>

      {step < 2 ? (
        <div className="checkout-grid">

          {/* ── LEFT: form steps ── */}
          <div>
            <StepIndicator current={step} />

            {/* STEP 0 — Shipping */}
            {step === 0 && (
              <div className="checkout-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                  <h3 style={{ margin: 0 }}>Shipping Information</h3>

                  {/* ── Auth user: quick-fill controls ── */}
                  {isAuthenticated && user && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* Saved addresses dropdown */}
                      {addrLoaded && addresses.length > 0 && (
                        <div style={{ position: 'relative' }}>
                          <select
                            defaultValue=""
                            onChange={e => {
                              const addr = addresses.find(a => String(a.id) === e.target.value)
                              if (addr) applyAddress(addr)
                              e.target.value = ''
                            }}
                            style={{
                              padding: '7px 28px 7px 12px', fontSize: 12, fontWeight: 600,
                              border: '1px solid var(--gold)', color: 'var(--gold)',
                              background: 'var(--gold-lt)', cursor: 'pointer',
                              appearance: 'none', WebkitAppearance: 'none',
                              paddingRight: 28,
                            }}
                          >
                            <option value="" disabled>Use saved address…</option>
                            {addresses.map(a => (
                              <option key={a.id} value={a.id}>
                                {a.label ? `${a.label} — ` : ''}{a.address}, {a.city}
                                {a.is_default ? ' (default)' : ''}
                              </option>
                            ))}
                          </select>
                          <span style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 10, color: 'var(--gold)' }}>▼</span>
                        </div>
                      )}

                      {/* Profile quick-fill button */}
                      <button
                        type="button"
                        onClick={applyProfile}
                        style={{
                          padding: '7px 14px', fontSize: 12, fontWeight: 600,
                          border: '1px solid var(--border)', background: 'var(--bg-alt)',
                          color: 'var(--text-2)', cursor: 'pointer', display: 'flex',
                          alignItems: 'center', gap: 6,
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: 13, height: 13, strokeWidth: 2 }}>
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                        </svg>
                        Fill my info
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Filled-from indicator ── */}
                {filledFrom && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'var(--bg-alt)', border: '1px solid var(--border)',
                    padding: '9px 14px', marginBottom: 18, fontSize: 12.5,
                    color: 'var(--text-2)',
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" style={{ width: 14, height: 14, strokeWidth: 2.5, flexShrink: 0 }}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {filledFrom === 'address' && 'Pre-filled from your saved address — feel free to edit any field.'}
                    {filledFrom === 'profile' && 'Pre-filled from your account — add your delivery address below.'}
                    {filledFrom === 'guest'   && 'We remembered your info from your last order — update anything that\'s changed.'}
                    {(filledFrom === 'address' || filledFrom === 'guest') && (
                      <button
                        type="button"
                        onClick={() => { setShip(INIT_SHIP); setFilledFrom(null); setAutofillBanner(false) }}
                        style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}

                {/* ── Guest sign-in nudge ── */}
                {!isAuthenticated && (
                  <div style={{ background: '#fffdf5', border: '1px solid #e8d999', padding: '10px 14px', marginBottom: 18, fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#888' }}>Have an account?</span>
                    <Link href={`/login?redirect=/checkout`} style={{ color: 'var(--gold)', fontWeight: 600, fontSize: 12.5 }}>Sign in</Link>
                    <span style={{ color: '#ccc' }}>·</span>
                    <span style={{ color: '#888' }}>Your info will be pre-filled automatically.</span>
                  </div>
                )}

                <div className="form-grid">
                  <Field label="First Name" id="firstName" value={ship.firstName} onChange={v => updShip('firstName', v)} required errors={errors} />
                  <Field label="Last Name"  id="lastName"  value={ship.lastName}  onChange={v => updShip('lastName', v)}  required errors={errors} />
                  <div className="full">
                    <Field label="Email Address" id="email" type="email" value={ship.email} onChange={v => updShip('email', v)} required errors={errors} />
                  </div>
                  <div className="full">
                    <Field label="Phone Number" id="phone" type="tel" value={ship.phone} onChange={v => updShip('phone', v)} errors={errors} />
                  </div>
                  <div className="full">
                    <Field label="Street Address" id="address" value={ship.address} onChange={v => updShip('address', v)} placeholder="123 Main St" required errors={errors} />
                  </div>
                  <Field label="Apt / Suite" id="apt" value={ship.apt} onChange={v => updShip('apt', v)} placeholder="Optional" errors={errors} />
                  <Field label="City" id="city" value={ship.city} onChange={v => updShip('city', v)} required errors={errors} />
                  <Field label="State / Province" id="state" value={ship.state} onChange={v => updShip('state', v)} errors={errors} />
                  <Field label="ZIP / Postal Code" id="zip" value={ship.zip} onChange={v => updShip('zip', v)} required errors={errors} />
                  <div className="full field-wrap">
                    <label className="field-label" htmlFor="country">Country</label>
                    <select
                      id="country"
                      className="field-input"
                      value={ship.country}
                      onChange={e => updShip('country', e.target.value)}
                    >
                      {['United States','United Kingdom','Canada','Australia','France','Germany','Spain','Italy'].map(c => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 1 — Payment */}
            {step === 1 && (
              <div className="checkout-section">
                <h3>Payment Method</h3>
                {[
                  { id: 'card',   label: 'Credit / Debit Card', icons: ['VISA','MC','AMEX'] },
                  { id: 'paypal', label: 'PayPal',              icons: ['PAYPAL'] },
                  { id: 'apple',  label: 'Apple Pay',           icons: ['APPLE PAY'] },
                ].map(m => (
                  <div
                    key={m.id}
                    className={`payment-method${pay.method === m.id ? ' selected' : ''}`}
                    onClick={() => updPay('method', m.id)}
                  >
                    <div className="pm-radio" />
                    <span className="pm-label">{m.label}</span>
                    <div className="pm-icons">
                      {m.icons.map(ic => <span key={ic} className="pm-icon">{ic}</span>)}
                    </div>
                  </div>
                ))}

                {pay.method === 'card' && (
                  <div className="form-grid" style={{ marginTop: 20 }}>
                    <div className="full">
                      <Field
                        label="Card Number" id="cardNum"
                        value={pay.cardNum}
                        onChange={v => updPay('cardNum', v.replace(/\D/g,'').replace(/(.{4})/g,'$1 ').trim().slice(0,19))}
                        placeholder="1234 5678 9012 3456"
                        required errors={errors}
                      />
                    </div>
                    <Field label="Expiry"  id="expiry"   value={pay.expiry}   onChange={v => updPay('expiry', v)}   placeholder="MM/YY" required errors={errors} />
                    <Field label="CVV"     id="cvv"      value={pay.cvv}      onChange={v => updPay('cvv', v)}      placeholder="123"   required errors={errors} />
                    <div className="full">
                      <Field label="Name on Card" id="cardName" value={pay.cardName} onChange={v => updPay('cardName', v)} required errors={errors} />
                    </div>
                  </div>
                )}

                {pay.method === 'paypal' && (
                  <div className="pm-info-box">
                    <p>You'll be redirected to PayPal to complete your purchase securely.</p>
                  </div>
                )}
                {pay.method === 'apple' && (
                  <div className="pm-info-box">
                    <p>Use Touch ID or Face ID to authorize payment with Apple Pay.</p>
                  </div>
                )}

                {/* Shipping review pill */}
                <div style={{ marginTop: 24, padding: '14px 16px', background: 'var(--bg-alt)', border: '1px solid var(--border)', fontSize: 13 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>Delivering to</div>
                  <div style={{ fontWeight: 500 }}>{ship.firstName} {ship.lastName}</div>
                  <div style={{ color: 'var(--text-2)', marginTop: 2 }}>
                    {ship.address}{ship.apt ? `, ${ship.apt}` : ''}, {ship.city}{ship.state ? `, ${ship.state}` : ''} {ship.zip}
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    style={{ marginTop: 8, fontSize: 11.5, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                  >
                    Edit address →
                  </button>
                </div>
              </div>
            )}

            {submitError && (
              <div style={{ background: '#fff0f0', border: '1px solid #ffc5c5', borderRadius: 6,
                padding: '12px 16px', marginBottom: 16, color: '#c0392b', fontSize: 14 }}>
                {submitError}
              </div>
            )}
            <div className="checkout-nav">
              {step > 0 && (
                <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>← Back</button>
              )}
              <button className="btn btn-dark" style={{ flex: 1 }} onClick={nextStep} disabled={submitting}>
                {submitting ? 'Placing order…' : step === 0 ? 'Continue to Payment →' : 'Place Order →'}
              </button>
            </div>
          </div>

          {/* ── RIGHT: order summary ── */}
          <div className="order-summary">
            <div className="os-title">Your Order</div>
            {items.map(item => (
              <div key={item.lineKey} className="os-item">
                <img src={item.images[0]} alt={item.name} className="os-item-img" />
                <div className="os-item-info">
                  <div className="os-item-name">{item.name}</div>
                  <div className="os-item-meta">{item.selectedColor} · {item.selectedSize} · Qty {item.qty}</div>
                </div>
                <div className="os-item-price">${(item.salePrice * item.qty).toFixed(2)}</div>
              </div>
            ))}
            <div className="os-row"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            <div className="os-row"><span>Shipping</span><span>{shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</span></div>
            <div className="os-row os-total">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="os-secure">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Secure checkout — 256-bit SSL
            </div>
          </div>
        </div>

      ) : (
        /* STEP 2 — Confirmation */
        <div className="confirmation-wrap">
          <div className="confirmation-banner">
            <div className="conf-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div className="conf-order">Order #{orderNumber}</div>
            <h2 className="conf-title">Thank you, {ship.firstName || 'valued customer'}!</h2>
            <p className="conf-text">
              Your order has been placed and is being prepared with care. A confirmation
              email will be sent to <strong>{ship.email || 'your email'}</strong> shortly.
            </p>

            {/* Guest account creation nudge */}
            {!isAuthenticated && (
              <div style={{ margin: '20px auto', maxWidth: 460, background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)', padding: '14px 18px', borderRadius: 4, fontSize: 13 }}>
                <span style={{ opacity: .85 }}>Want to track this order and save your details for next time? </span>
                <Link href="/login" style={{ color: 'var(--gold)', fontWeight: 600 }}>Create a free account →</Link>
              </div>
            )}

            <div className="conf-actions">
              <button className="btn btn-dark" onClick={() => router.push('/')}>Back to Home</button>
              <button className="btn btn-outline" onClick={() => router.push('/shop')}>Continue Shopping</button>
            </div>
          </div>

          <div className="delivery-timeline">
            <h3>Estimated Delivery</h3>
            <div className="delivery-steps">
              {[
                { label: 'Order Confirmed',      sub: 'Today' },
                { label: 'Processing & Packing', sub: '1–2 business days' },
                { label: 'Delivered',            sub: '3–5 business days' },
              ].map((s, i) => (
                <div key={s.label} className="delivery-step">
                  <div className={`delivery-dot${i === 0 ? ' active' : ''}`}>
                    {i === 0 ? '✓' : i + 1}
                  </div>
                  <div className="delivery-label">{s.label}</div>
                  <div className="delivery-sub">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
