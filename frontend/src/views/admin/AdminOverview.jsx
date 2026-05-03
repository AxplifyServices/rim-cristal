'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import AdminShell from './AdminShell'
import { api } from '../../lib/api'

function StatCard({ label, value, sub, color = 'var(--gold)' }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e8e3dc', padding: '22px 24px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: '#aaa', marginBottom: 10 }}>{label}</div>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: 32, fontWeight: 700, color, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#aaa' }}>{sub}</div>}
    </div>
  )
}

const STATUS_STYLE = {
  pending:    { bg: '#fef3e2', color: '#b45309' },
  processing: { bg: '#fef3e2', color: '#b45309' },
  shipped:    { bg: '#e8f0fe', color: '#1a56db' },
  delivered:  { bg: '#e6f4ee', color: '#2e7d5a' },
  cancelled:  { bg: '#fde8e8', color: '#c0392b' },
}

export default function AdminOverview() {
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/stats')
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const fmt = (n) => n != null ? Number(n).toLocaleString('en-US') : '—'
  const fmtMoney = (n) => n != null ? `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'
  const statusStyle = (s) => STATUS_STYLE[s?.toLowerCase()] || STATUS_STYLE.pending

  return (
    <AdminShell>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 600, marginBottom: 4 }}>Dashboard</h1>
        <p style={{ fontSize: 13.5, color: '#888' }}>Welcome back! Here's what's happening with your store.</p>
      </div>

      {loading ? (
        <p style={{ color: '#aaa' }}>Loading stats…</p>
      ) : (
        <>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 32 }}>
            <StatCard label="Total Revenue"        value={fmtMoney(stats?.total_revenue)}        sub="All time"         color="#b8963e" />
            <StatCard label="Total Orders"         value={fmt(stats?.total_orders)}               sub={`${stats?.pending_orders || 0} pending`} color="#1a1814" />
            <StatCard label="Total Customers"      value={fmt(stats?.total_users)}                sub="Registered"      color="#7c3aed" />
            <StatCard label="Active Products"      value={fmt(stats?.total_products)}             sub="In catalog"      color="#1a56db" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Top Products */}
            <div style={{ background: 'white', border: '1px solid #e8e3dc', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 600 }}>Top Products</h3>
                <Link href="/admin/products" style={{ fontSize: 11.5, color: '#b8963e', textDecoration: 'none' }}>View all →</Link>
              </div>
              {(stats?.top_products || []).length === 0 ? (
                <p style={{ color: '#aaa', fontSize: 13 }}>No data yet</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(stats?.top_products || []).map((p, i) => (
                    <div key={p.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f5f3f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#888', flexShrink: 0 }}>{i + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                        <div style={{ fontSize: 11.5, color: '#aaa' }}>{p.units_sold || 0} sold</div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#b8963e', flexShrink: 0 }}>{fmtMoney(p.revenue)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Orders */}
            <div style={{ background: 'white', border: '1px solid #e8e3dc', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 600 }}>Recent Orders</h3>
                <Link href="/admin/orders" style={{ fontSize: 11.5, color: '#b8963e', textDecoration: 'none' }}>View all →</Link>
              </div>
              {(stats?.recent_orders || []).length === 0 ? (
                <p style={{ color: '#aaa', fontSize: 13 }}>No orders yet</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(stats?.recent_orders || []).map(order => {
                    const ss = statusStyle(order.status)
                    return (
                      <div key={order.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #f0ece6' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{order.order_number}</div>
                          <div style={{ fontSize: 11.5, color: '#aaa' }}>{order.customer || `${order.shipping_first_name || ''} ${order.shipping_last_name || ''}`.trim()}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ background: ss.bg, color: ss.color, fontSize: 10.5, fontWeight: 600, padding: '2px 8px' }}>
                            {order.status}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>${parseFloat(order.total || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ marginTop: 24, background: 'white', border: '1px solid #e8e3dc', padding: '20px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: '#aaa', marginBottom: 16 }}>Quick Links</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { label: 'View Store',      href: '/'                },
                { label: 'All Orders',      href: '/admin/orders'    },
                { label: 'Manage Products', href: '/admin/products'  },
                { label: 'Manage Coupons',  href: '/admin/coupons'   },
                { label: 'View Messages',   href: '/admin/messages'  },
                { label: 'Moderate Reviews',href: '/admin/reviews'   },
              ].map(a => (
                <Link key={a.label} href={a.href} style={{
                  padding: '8px 16px', border: '1px solid #e8e3dc',
                  fontSize: 12.5, fontWeight: 500, color: '#444',
                  textDecoration: 'none', background: '#faf8f5',
                }}>
                  {a.label}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </AdminShell>
  )
}
