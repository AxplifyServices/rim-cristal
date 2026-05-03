'use client'
import { useState, useEffect } from 'react'
import AdminShell from './AdminShell'
import { api } from '../../lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

const STATUS_OPTIONS = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
const STATUS_STYLE = {
  pending:    { bg: '#fef3e2', color: '#b45309' },
  processing: { bg: '#fef3e2', color: '#b45309' },
  shipped:    { bg: '#e8f0fe', color: '#1a56db' },
  delivered:  { bg: '#e6f4ee', color: '#2e7d5a' },
  cancelled:  { bg: '#fde8e8', color: '#c0392b' },
}

export default function AdminOrders() {
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')
  const [search, setSearch]   = useState('')
  const [expanded, setExp]    = useState(null)
  const [updating, setUpdating] = useState(null)

  useEffect(() => {
    setLoading(true)
    api.get('/orders')
      .then(data => setOrders(Array.isArray(data) ? data : (data.items || [])))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [])

  const updateStatus = async (orderId, status) => {
    setUpdating(orderId)
    try {
      const updated = await api.patch(`/orders/${orderId}/status`, { status })
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: updated.status || status } : o))
    } catch { /* show nothing */ }
    finally { setUpdating(null) }
  }

  const filtered = orders.filter(o => {
    if (filter !== 'all' && o.status?.toLowerCase() !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        o.order_number?.toLowerCase().includes(q) ||
        o.shipping_email?.toLowerCase().includes(q) ||
        `${o.shipping_first_name} ${o.shipping_last_name}`.toLowerCase().includes(q)
      )
    }
    return true
  })

  const formatDate = (d) => {
    try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
    catch { return d }
  }

  const ss = (s) => STATUS_STYLE[s?.toLowerCase()] || STATUS_STYLE.pending

  return (
    <AdminShell>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 600, marginBottom: 4 }}>Orders</h1>
          <p style={{ fontSize: 13, color: '#888' }}>{orders.length} total orders</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search order #, name, email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '9px 14px', border: '1px solid #e8e3dc', fontSize: 13, flex: '0 0 280px', background: 'white' }}
        />
        {['all', ...STATUS_OPTIONS].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: filter === s ? '#1a1814' : 'white',
              color: filter === s ? 'white' : '#555',
              border: '1px solid #e8e3dc', textTransform: 'capitalize',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'white', border: '1px solid #e8e3dc' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 1fr 120px 80px', gap: 0, padding: '12px 20px', borderBottom: '2px solid #e8e3dc', fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#aaa' }}>
          <span>Order</span><span>Customer</span><span>Date</span><span>Total</span><span>Status</span><span></span>
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#aaa', fontSize: 13 }}>Loading orders…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#aaa', fontSize: 13 }}>No orders found.</div>
        ) : filtered.map(order => (
          <div key={order.id}>
            <div
              style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 1fr 120px 80px', gap: 0, padding: '14px 20px', borderBottom: '1px solid #f0ece6', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setExp(expanded === order.id ? null : order.id)}
            >
              <span style={{ fontSize: 13.5, fontWeight: 600, fontFamily: 'Georgia, serif' }}>{order.order_number}</span>
              <div>
                <div style={{ fontSize: 13 }}>{order.shipping_first_name} {order.shipping_last_name}</div>
                <div style={{ fontSize: 11.5, color: '#aaa' }}>{order.shipping_email}</div>
              </div>
              <span style={{ fontSize: 13, color: '#555' }}>{formatDate(order.created_at)}</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>${parseFloat(order.total || 0).toFixed(2)}</span>
              <span style={{ background: ss(order.status).bg, color: ss(order.status).color, fontSize: 11, fontWeight: 600, padding: '3px 8px', textTransform: 'capitalize', display: 'inline-block' }}>
                {order.status || 'pending'}
              </span>
              <span style={{ fontSize: 20, color: '#ccc', textAlign: 'center' }}>{expanded === order.id ? '▲' : '▼'}</span>
            </div>

            {expanded === order.id && (
              <div style={{ background: '#faf8f5', borderBottom: '1px solid #e8e3dc', padding: '20px 24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginBottom: 20 }}>
                  {/* Items */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#aaa', marginBottom: 12 }}>Items</div>
                    {(order.items || []).map((item, i) => (
                      <div key={i} style={{ fontSize: 13, marginBottom: 6 }}>
                        <span style={{ fontWeight: 600 }}>{item.product_name}</span>
                        <span style={{ color: '#888' }}> × {item.quantity} — ${parseFloat(item.unit_price || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  {/* Shipping */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#aaa', marginBottom: 12 }}>Shipping</div>
                    <address style={{ fontStyle: 'normal', lineHeight: 1.8, fontSize: 13 }}>
                      {order.shipping_first_name} {order.shipping_last_name}<br />
                      {order.shipping_address}{order.shipping_apt ? `, ${order.shipping_apt}` : ''}<br />
                      {order.shipping_city}{order.shipping_state ? `, ${order.shipping_state}` : ''} {order.shipping_zip}<br />
                      {order.shipping_country}
                    </address>
                    {order.shipping_email && <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>{order.shipping_email}</div>}
                  </div>
                  {/* Update status */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#aaa', marginBottom: 12 }}>Update Status</div>
                    <select
                      value={order.status || 'pending'}
                      onChange={e => updateStatus(order.id, e.target.value)}
                      disabled={updating === order.id}
                      style={{ padding: '8px 12px', border: '1px solid #e8e3dc', fontSize: 13, background: 'white', width: '100%', marginBottom: 8 }}
                    >
                      {STATUS_OPTIONS.map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                    {updating === order.id && <span style={{ fontSize: 12, color: '#b8963e' }}>Saving…</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 24, fontSize: 13, paddingTop: 12, borderTop: '1px solid #e8e3dc' }}>
                  <span>Subtotal: <strong>${parseFloat(order.subtotal || 0).toFixed(2)}</strong></span>
                  <span>Shipping: <strong>${parseFloat(order.shipping_cost || 0).toFixed(2)}</strong></span>
                  {parseFloat(order.discount_amount || 0) > 0 && <span style={{ color: '#2e7d5a' }}>Discount: <strong>-${parseFloat(order.discount_amount).toFixed(2)}</strong></span>}
                  <span>Total: <strong style={{ fontFamily: 'Georgia, serif', fontSize: 15 }}>${parseFloat(order.total || 0).toFixed(2)}</strong></span>
                  <span>Payment: <strong style={{ textTransform: 'capitalize' }}>{order.payment_method || '—'}</strong></span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </AdminShell>
  )
}
