'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { clearAdminSession, getAdminUser, requireAdminSession } from '../lib/adminAuth'
import { useAdminI18n } from '../i18n/AdminI18nProvider'

export default function AdminShell({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const { t, locale, setLocale } = useAdminI18n()

  const [user, setUser] = useState(null)

  useEffect(() => {
    const token = requireAdminSession(router)
    if (!token) return

    setUser(getAdminUser())
  }, [router])

    useEffect(() => {
    if (!user) return

    const adminOnlyPaths = [
      '/admin/points-of-sale',
      '/admin/stock',
      '/admin/orders',
    ]

    if (user.role !== 'admin' && adminOnlyPaths.includes(pathname)) {
      router.replace('/admin')
    }
  }, [user, pathname, router])

  const nav = useMemo(() => {
    const role = user?.role

    const all = [
      { href: '/admin', label: t('nav.dashboard'), roles: ['admin', 'point_of_sale'] },
      { href: '/admin/products', label: t('nav.products'), roles: ['admin', 'point_of_sale'] },
      { href: '/admin/points-of-sale', label: t('nav.pointsOfSale'), roles: ['admin'] },
      { href: '/admin/sales', label: t('nav.sales'), roles: ['admin', 'point_of_sale'] },
      { href: '/admin/stock', label: t('nav.stock'), roles: ['admin'] },
      { href: '/admin/orders', label: t('nav.orders'), roles: ['admin'] },
    ]

    return all.filter(item => item.roles.includes(role))
  }, [user, t])

  function logout() {
    clearAdminSession()
    router.replace('/admin/login')
  }

  if (!user) {
    return (
      <main style={styles.loading}>
        {t('common.loading')}
      </main>
    )
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.brand}>{t('app.name')}</div>
          <div style={styles.user}>
            {user.role === 'admin' ? 'Admin' : user.point_of_sale?.name || 'Point de vente'}
          </div>
        </div>

        <div style={styles.headerActions}>
          <select
            value={locale}
            onChange={e => setLocale(e.target.value)}
            style={styles.lang}
          >
            <option value="fr">FR</option>
            <option value="en">EN</option>
          </select>

          <button onClick={logout} style={styles.logout}>
            {t('auth.logout')}
          </button>
        </div>
      </header>

      <section style={styles.content}>
        {children}
      </section>

      <nav style={styles.bottomNav}>
        {nav.map(item => {
          const active = pathname === item.href

          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              style={{
                ...styles.navButton,
                ...(active ? styles.navButtonActive : {}),
              }}
            >
              {item.label}
            </button>
          )
        })}
      </nav>
    </main>
  )
}

const styles = {
  loading: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    background: '#f7f3ed',
    color: '#8a7f72',
  },
  page: {
    minHeight: '100vh',
    background: '#f7f3ed',
    color: '#1f1a14',
    paddingBottom: 82,
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    background: 'rgba(247, 243, 237, 0.94)',
    backdropFilter: 'blur(14px)',
    borderBottom: '1px solid #e6ded2',
    padding: '14px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
  },
  brand: {
    fontSize: 17,
    fontWeight: 900,
    letterSpacing: '-0.03em',
  },
  user: {
    marginTop: 3,
    fontSize: 12,
    color: '#8a7f72',
  },
  headerActions: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  lang: {
    height: 36,
    border: '1px solid #e6ded2',
    borderRadius: 12,
    background: '#fff',
    padding: '0 8px',
    fontSize: 12,
  },
  logout: {
    height: 36,
    border: '1px solid #e6ded2',
    borderRadius: 12,
    background: '#fff',
    padding: '0 10px',
    fontSize: 12,
    cursor: 'pointer',
  },
  content: {
    padding: 16,
    maxWidth: 1180,
    margin: '0 auto',
  },
  bottomNav: {
    position: 'fixed',
    left: 12,
    right: 12,
    bottom: 12,
    zIndex: 20,
    background: '#1f1a14',
    borderRadius: 24,
    padding: 8,
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 6,
    boxShadow: '0 20px 60px rgba(31, 26, 20, 0.25)',
  },
  navButton: {
    border: 'none',
    borderRadius: 16,
    background: 'transparent',
    color: '#d8cfc3',
    padding: '10px 6px',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
  },
  navButtonActive: {
    background: '#fff',
    color: '#1f1a14',
  },
}