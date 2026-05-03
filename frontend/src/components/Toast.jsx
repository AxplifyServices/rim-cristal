'use client'
import { useCart } from '../context/CartContext'

export default function Toast() {
  const { toast } = useCart()
  return (
    <div className={`toast${toast ? ' show' : ''}`} role="status" aria-live="polite">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      <span>{toast}</span>
    </div>
  )
}
