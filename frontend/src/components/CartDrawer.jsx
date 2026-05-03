'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { useCart } from '../context/CartContext'

export default function CartDrawer() {
  const { items, drawerOpen, closeDrawer, removeFromCart, setQty, subtotal, shippingDiff, shipPct, isFreeShip } = useCart()

  // lock body scroll
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  return (
    <>
      <div className={`cart-overlay${drawerOpen ? ' open' : ''}`} onClick={closeDrawer} />
      <div className={`cart-drawer${drawerOpen ? ' open' : ''}`}>
        {/* Header */}
        <div className="cart-hdr">
          <span className="cart-hdr-title">Shopping Bag</span>
          <button className="cart-hdr-close" onClick={closeDrawer} aria-label="Close cart">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="cart-body">
          {items.length === 0 ? (
            <div className="cart-empty">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              <p>Your bag is empty.<br />Discover our curated collection.</p>
              <button className="btn btn-dark" onClick={closeDrawer} style={{ marginTop: 8 }}>Shop Now</button>
            </div>
          ) : (
            items.map(item => (
              <div key={item.lineKey} className="cart-line">
                <img className="cart-line-img" src={item.images[0]} alt={item.name} />
                <div className="cart-line-info">
                  <div className="cart-line-name">{item.name}</div>
                  <div className="cart-line-meta">{item.selectedColor} · {item.selectedSize}</div>
                  <div className="cart-line-price">${item.salePrice.toFixed(2)} each</div>
                  <div className="cart-qty">
                    <button className="qty-btn" onClick={() => setQty(item.lineKey, item.qty - 1)}>−</button>
                    <span className="qty-num">{item.qty}</span>
                    <button className="qty-btn" onClick={() => setQty(item.lineKey, item.qty + 1)}>+</button>
                  </div>
                  <span className="cart-remove" onClick={() => removeFromCart(item.lineKey)}>Remove</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="cart-ftr">
            <div className="cart-row">
              <span className="cart-row-lbl">Subtotal</span>
              <span className="cart-row-val">${subtotal.toFixed(2)}</span>
            </div>
            <div className="cart-row">
              <span className="cart-row-lbl">Shipping</span>
              <span className="cart-row-val">{isFreeShip ? 'FREE' : 'Calculated at checkout'}</span>
            </div>

            <div className="ship-bar">
              <span style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                {isFreeShip ? '🎉 Free shipping unlocked!' : `$${shippingDiff.toFixed(2)} away from free shipping`}
              </span>
              <div className="ship-track">
                <div className="ship-fill" style={{ width: `${shipPct}%` }} />
              </div>
            </div>

            <div className="cart-row cart-total">
              <span className="cart-row-lbl">Total</span>
              <span className="cart-row-val">${subtotal.toFixed(2)}</span>
            </div>

            <Link href="/checkout" onClick={closeDrawer} className="btn btn-dark btn-full" style={{ marginTop: 16, display: 'flex' }}>
              Proceed to Checkout →
            </Link>
            <Link href="/cart" onClick={closeDrawer} className="btn btn-ghost btn-full" style={{ marginTop: 10, display: 'flex' }}>
              View Full Cart
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
