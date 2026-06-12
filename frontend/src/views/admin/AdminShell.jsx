'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '../../context/AuthContext'

const NAV = [
  { label: 'Tableau de bord', href: '/admin', icon: '◈' },
  { label: 'Produits & stock', href: '/admin/products', icon: '💡' },
  { label: 'Points de vente', href: '/admin/points-of-sale', icon: '🏬' },
  { label: 'Ventes points de vente', href: '/admin/sales', icon: '🧾' },
  { label: 'Commandes web', href: '/admin/orders', icon: '📦' },
  { label: 'Mouvements stock', href: '/admin/stock-movements', icon: '↔' },
]

export default function AdminShell({ children }) {
  const { user, isAuthenticated, loading, logout } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && (!isAuthenticated || !user?.is_admin)) {
      router.push('/login?redirect=/admin')
    }
  }, [loading, isAuthenticated, user, router])

  if (loading || !isAuthenticated || !user?.is_admin) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>Loading…</div>
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8f7f5' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, flexShrink: 0, background: '#1a1814', color: 'white',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
      }}>
        <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
          <Link href="/" style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: '#b8963e', textDecoration: 'none', letterSpacing: '.03em' }}>
            Rim <em>Cristal</em>
          </Link>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', marginTop: 4, letterSpacing: '.1em', textTransform: 'uppercase' }}>Gestion stock & points de vente</div>
        </div>

        <nav style={{ flex: 1, padding: '12px 0' }}>
          {NAV.map(item => {
            const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 20px', fontSize: 13.5, fontWeight: 500,
                  color: isActive ? '#b8963e' : 'rgba(255,255,255,.65)',
                  background: isActive ? 'rgba(184,150,62,.1)' : 'transparent',
                  borderLeft: isActive ? '2px solid #b8963e' : '2px solid transparent',
                  textDecoration: 'none', transition: 'all .15s',
                }}
              >
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,.1)' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginBottom: 4 }}>{user?.first_name} {user?.last_name}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', marginBottom: 12 }}>{user?.email}</div>
          <button
            onClick={() => { logout(); router.push('/') }}
            style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', background: 'none', border: '1px solid rgba(255,255,255,.15)', padding: '6px 12px', cursor: 'pointer', width: '100%' }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ marginLeft: 220, flex: 1, minHeight: '100vh', padding: '36px 40px' }}>
        {children}
      </main>
    </div>
  )
}
