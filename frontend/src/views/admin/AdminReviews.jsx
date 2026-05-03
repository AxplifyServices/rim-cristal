'use client'
import { useState, useEffect } from 'react'
import AdminShell from './AdminShell'
import { api } from '../../lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

export default function AdminReviews() {
  const [products, setProducts]   = useState([])
  const [prodLoading, setProdLoad] = useState(true)
  const [prodError, setProdError] = useState('')

  const [reviews, setReviews]     = useState([])
  const [revLoading, setRevLoad]  = useState(false)
  const [selProduct, setSel]      = useState(null)
  const [msg, setMsg]             = useState('')

  // Load all products
  useEffect(() => {
    setProdLoad(true)
    setProdError('')
    api.get('/products?page_size=200')
      .then(data => {
        const items = Array.isArray(data) ? data : (data.items || [])
        setProducts(items)
        if (items.length > 0) setSel(items[0].id)
        else setProdError('No products found in the catalog.')
      })
      .catch(err => {
        setProdError('Could not load products: ' + (err.message || 'API error'))
      })
      .finally(() => setProdLoad(false))
  }, [])

  // Load reviews whenever selected product changes
  useEffect(() => {
    if (!selProduct) return
    setRevLoad(true)
    setReviews([])
    fetch(`${API_URL}/products/${selProduct}/reviews?page_size=50`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => setReviews(Array.isArray(data) ? data : (data.items || [])))
      .catch(() => setReviews([]))
      .finally(() => setRevLoad(false))
  }, [selProduct])

  const deleteReview = async (reviewId) => {
    if (!confirm('Delete this review? This cannot be undone.')) return
    try {
      await api.del(`/reviews/${reviewId}`)
      setReviews(prev => prev.filter(r => r.id !== reviewId))
      setMsg('Review deleted.')
      setTimeout(() => setMsg(''), 3000)
    } catch (err) {
      setMsg('Error: ' + (err.message || 'Could not delete review.'))
      setTimeout(() => setMsg(''), 4000)
    }
  }

  const formatDate = (d) => {
    try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
    catch { return d }
  }

  const selectedProduct = products.find(p => p.id === selProduct)

  return (
    <AdminShell>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 600, marginBottom: 4 }}>Reviews</h1>
        <p style={{ fontSize: 13, color: '#888' }}>Moderate customer reviews by product.</p>
      </div>

      {msg && (
        <div style={{
          background: msg.startsWith('Error') ? '#fde8e8' : '#e6f4ee',
          border: `1px solid ${msg.startsWith('Error') ? '#ffc5c5' : '#b7ebc7'}`,
          padding: '10px 16px', fontSize: 13,
          color: msg.startsWith('Error') ? '#c0392b' : '#2e7d5a',
          marginBottom: 20,
        }}>
          {msg}
        </div>
      )}

      {/* Product selector */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 8 }}>
          Select Product
        </label>

        {prodLoading ? (
          <div style={{ fontSize: 13, color: '#aaa' }}>Loading products…</div>
        ) : prodError ? (
          <div style={{ fontSize: 13, color: '#c0392b', background: '#fde8e8', border: '1px solid #ffc5c5', padding: '10px 14px' }}>
            {prodError}
          </div>
        ) : (
          <select
            value={selProduct || ''}
            onChange={e => setSel(parseInt(e.target.value))}
            style={{ padding: '9px 14px', border: '1px solid #e8e3dc', fontSize: 13, background: 'white', minWidth: 380 }}
          >
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Reviews list */}
      {!prodLoading && !prodError && (
        <>
          {revLoading ? (
            <div style={{ padding: '40px 24px', textAlign: 'center', border: '1px solid #e8e3dc', background: 'white', color: '#aaa', fontSize: 13 }}>
              Loading reviews…
            </div>
          ) : reviews.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center', border: '1px solid #e8e3dc', background: 'white', color: '#aaa', fontSize: 13 }}>
              No reviews yet for <strong>{selectedProduct?.name || 'this product'}</strong>.
            </div>
          ) : (
            <div style={{ border: '1px solid #e8e3dc', background: 'white' }}>
              {/* Header row */}
              <div style={{
                display: 'grid', gridTemplateColumns: '80px 160px 1fr 120px 80px',
                padding: '12px 20px', borderBottom: '2px solid #e8e3dc',
                fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em',
                textTransform: 'uppercase', color: '#aaa',
              }}>
                <span>Rating</span>
                <span>Reviewer</span>
                <span>Review</span>
                <span>Date</span>
                <span>Action</span>
              </div>

              {reviews.map(r => (
                <div key={r.id} style={{
                  display: 'grid', gridTemplateColumns: '80px 160px 1fr 120px 80px',
                  padding: '14px 20px', borderBottom: '1px solid #f0ece6',
                  alignItems: 'start', gap: 16,
                }}>
                  {/* Stars */}
                  <div style={{ display: 'flex', gap: 2, paddingTop: 2 }}>
                    {[1,2,3,4,5].map(i => (
                      <span key={i} style={{ color: i <= r.rating ? '#b8963e' : '#ddd', fontSize: 15 }}>★</span>
                    ))}
                  </div>

                  {/* Reviewer */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.guest_name || 'Verified Customer'}</div>
                    {r.guest_email && <div style={{ fontSize: 11.5, color: '#aaa', marginTop: 2 }}>{r.guest_email}</div>}
                  </div>

                  {/* Content */}
                  <div>
                    {r.title && <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{r.title}</div>}
                    <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>{r.body}</div>
                  </div>

                  {/* Date */}
                  <span style={{ fontSize: 12, color: '#aaa' }}>{formatDate(r.created_at)}</span>

                  {/* Delete */}
                  <button
                    onClick={() => deleteReview(r.id)}
                    style={{
                      fontSize: 11, padding: '5px 10px', cursor: 'pointer',
                      background: '#fde8e8', border: '1px solid #ffc5c5', color: '#c0392b',
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </AdminShell>
  )
}
