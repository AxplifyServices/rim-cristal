'use client'
import { useState, useEffect } from 'react'
import AdminShell from './AdminShell'
import { api } from '../../lib/api'

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [toggling, setToggling] = useState(null)
  const [msg, setMsg]           = useState('')

  useEffect(() => {
    setLoading(true)
    api.get('/products?page_size=200&include_inactive=true')
      .then(data => setProducts(Array.isArray(data) ? data : (data.items || [])))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [])

  const toggleActive = async (product) => {
    setToggling(product.id)
    try {
      const updated = await api.put(`/products/${product.id}`, { is_active: !product.is_active })
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: updated.is_active ?? !product.is_active } : p))
      setMsg(`"${product.name}" ${!product.is_active ? 'activated' : 'deactivated'}.`)
      setTimeout(() => setMsg(''), 3000)
    } catch { /* ignore */ }
    finally { setToggling(null) }
  }

  const filtered = products.filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.name?.toLowerCase().includes(q) || p.slug?.toLowerCase().includes(q) || p.categorie?.toLowerCase().includes(q)
  })

  return (
    <AdminShell>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 600, marginBottom: 4 }}>Products</h1>
          <p style={{ fontSize: 13, color: '#888' }}>{products.length} products in catalog</p>
        </div>
      </div>

      {msg && (
        <div style={{ background: '#e6f4ee', border: '1px solid #b7ebc7', padding: '10px 16px', fontSize: 13, color: '#2e7d5a', marginBottom: 20 }}>
          {msg}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search products by name, slug, or category…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '9px 14px', border: '1px solid #e8e3dc', fontSize: 13, width: 320, background: 'white' }}
        />
      </div>

      <div style={{ background: 'white', border: '1px solid #e8e3dc' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 100px 90px 90px 90px 80px', padding: '12px 20px', borderBottom: '2px solid #e8e3dc', fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#aaa' }}>
          <span>IMG</span><span>Product</span><span>Category</span><span>Price</span><span>Sale Price</span><span>Stock</span><span>Status</span>
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#aaa', fontSize: 13 }}>Loading products…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#aaa', fontSize: 13 }}>No products found.</div>
        ) : filtered.map(p => (
          <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 100px 90px 90px 90px 80px', padding: '12px 20px', borderBottom: '1px solid #f0ece6', alignItems: 'center', opacity: p.is_active ? 1 : 0.55 }}>
            <div style={{ width: 44, height: 54, background: '#f0ece6', overflow: 'hidden', flexShrink: 0 }}>
              {p.url_image1 && <img src={p.url_image1} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 2 }}>{p.name}</div>
              <div style={{ fontSize: 11.5, color: '#aaa' }}>{p.slug} · ref: {p.reference || '—'}</div>
            </div>
            <span style={{ fontSize: 12, color: '#666', textTransform: 'capitalize' }}>{p.categorie || '—'}</span>
            <span style={{ fontSize: 13 }}>${parseFloat(p.price || 0).toFixed(2)}</span>
            <span style={{ fontSize: 13, color: '#2e7d5a', fontWeight: 600 }}>${parseFloat(p.sale_price || p.price || 0).toFixed(2)}</span>
            <span style={{ fontSize: 13 }}>{p.stock ?? '—'}</span>
            <button
              onClick={() => toggleActive(p)}
              disabled={toggling === p.id}
              style={{
                padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid',
                background: p.is_active ? '#e6f4ee' : '#fde8e8',
                color: p.is_active ? '#2e7d5a' : '#c0392b',
                borderColor: p.is_active ? '#b7ebc7' : '#ffc5c5',
              }}
            >
              {toggling === p.id ? '…' : p.is_active ? 'Active' : 'Inactive'}
            </button>
          </div>
        ))}
      </div>
    </AdminShell>
  )
}
