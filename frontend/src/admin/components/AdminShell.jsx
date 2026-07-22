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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

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
  '/admin/contacts',
  '/admin/brochures',
  '/admin/reviews',
]

    if (user.role !== 'admin' && adminOnlyPaths.includes(pathname)) {
      router.replace('/admin')
    }
  }, [user, pathname, router])

  const nav = useMemo(() => {
    const role = user?.role

const all = [
  {
    href: '/admin',
    label: t('nav.dashboard'),
    shortLabel: t('navShort.dashboard'),
    roles: ['admin', 'point_of_sale'],
  },
  {
    href: '/admin/products',
    label: t('nav.products'),
    shortLabel: t('navShort.products'),
    roles: ['admin', 'point_of_sale'],
  },

{
  href: '/admin/brochures',
  label: t('nav.brochures'),
  shortLabel: t('navShort.brochures'),
  roles: ['admin'],
},

{
  href: '/admin/reviews',
  label: t('nav.reviews'),
  shortLabel: t('navShort.reviews'),
  roles: ['admin'],
},

  {
    href: '/admin/points-of-sale',
    label: t('nav.pointsOfSale'),
    shortLabel: t('navShort.pointsOfSale'),
    roles: ['admin'],
  },
  {
    href: '/admin/sales',
    label: t('nav.sales'),
    shortLabel: t('navShort.sales'),
    roles: ['admin', 'point_of_sale'],
  },
  {
    href: '/admin/stock',
    label: t('nav.stock'),
    shortLabel: t('navShort.stock'),
    roles: ['admin'],
  },
{
  href: '/admin/orders',
  label: t('nav.orders'),
  shortLabel: t('navShort.orders'),
  roles: ['admin', 'point_of_sale'],
},
  {
    href: '/admin/contacts',
    label: t('nav.contacts'),
    shortLabel: t('navShort.contacts'),
    roles: ['admin'],
  },
]
    

    return all.filter(item => item.roles.includes(role))
  }, [user, t])

  function logout() {
    clearAdminSession()
    router.replace('/admin/login')
  }

  function goTo(path) {
    router.push(path)
    setSidebarOpen(false)
  }

  if (!user) {
    return (
      <main style={styles.loading}>
        {t('common.loading')}
      </main>
    )
  }

  const roleLabel = user.role === 'admin'
    ? t('roles.admin')
    : user.point_of_sale?.name || t('roles.pointOfSale')

  return (
    <main style={styles.page}>
      <style jsx global>{`
        @media (max-width: 820px) {
          .admin-sidebar {
            transform: translateX(-110%);
            width: 280px !important;
          }

          .admin-sidebar.is-open {
            transform: translateX(0);
          }

          .admin-main {
            margin-left: 0 !important;
          }

          .admin-desktop-toggle {
            display: none !important;
          }

          .admin-mobile-toggle {
            display: inline-flex !important;
          }

          .admin-sidebar-label {
            display: inline !important;
          }
        }

        @media (min-width: 821px) {
          .admin-sidebar.is-collapsed {
            width: 84px !important;
          }

          .admin-sidebar.is-collapsed .admin-brand-text,
          .admin-sidebar.is-collapsed .admin-sidebar-user,
          .admin-sidebar.is-collapsed .admin-sidebar-label,
          .admin-sidebar.is-collapsed .admin-sidebar-footer-text {
            display: none !important;
          }

          .admin-sidebar.is-collapsed .admin-sidebar-header {
            justify-content: center !important;
          }

          .admin-sidebar.is-collapsed .admin-nav-button {
            justify-content: center !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }

          .admin-sidebar.is-collapsed .admin-lang-select {
            text-align: center !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }

          .admin-main.is-collapsed {
            margin-left: 84px !important;
          }
        }
      `}</style>

      {sidebarOpen && (
        <button
          type="button"
          aria-label={t('common.close')}
          onClick={() => setSidebarOpen(false)}
          style={styles.overlay}
        />
      )}

      <aside
        className={[
          'admin-sidebar',
          sidebarOpen ? 'is-open' : '',
          sidebarCollapsed ? 'is-collapsed' : '',
        ].join(' ')}
        style={styles.sidebar}
      >
        <div className="admin-sidebar-header" style={styles.sidebarHeader}>
          <div className="admin-brand-text">
            <div style={styles.brand}>{t('app.name')}</div>
            <div className="admin-sidebar-user" style={styles.user}>
              {roleLabel}
            </div>
          </div>

          <button
            type="button"
            className="admin-desktop-toggle"
            onClick={() => setSidebarCollapsed(current => !current)}
            style={styles.iconButton}
            aria-label={sidebarCollapsed ? t('nav.expand') : t('nav.collapse')}
          >
            {sidebarCollapsed ? '›' : '‹'}
          </button>
        </div>

        <nav style={styles.nav}>
          {nav.map(item => {
            const active = pathname === item.href

            return (
              <button
                key={item.href}
                type="button"
                onClick={() => goTo(item.href)}
                className="admin-nav-button"
                style={{
                  ...styles.navButton,
                  ...(active ? styles.navButtonActive : {}),
                }}
                title={item.label}
              >
                <span className="admin-sidebar-label">
                  {sidebarCollapsed ? item.shortLabel : item.label}
                </span>
              </button>
            )
          })}
        </nav>

        <div style={styles.sidebarFooter}>
          <div className="admin-sidebar-footer-text" style={styles.footerText}>
            {t('common.language')}
          </div>

          <select
            className="admin-lang-select"
            value={locale}
            onChange={e => setLocale(e.target.value)}
            style={styles.lang}
          >
            <option value="fr">FR</option>
            <option value="en">EN</option>
          </select>

          <button onClick={logout} style={styles.logout}>
            <span className="admin-sidebar-label">{t('auth.logout')}</span>
            <span>{sidebarCollapsed ? '⎋' : ''}</span>
          </button>
        </div>
      </aside>

      <section
        className={[
          'admin-main',
          sidebarCollapsed ? 'is-collapsed' : '',
        ].join(' ')}
        style={styles.main}
      >
        <header style={styles.mobileHeader}>
          <button
            type="button"
            className="admin-mobile-toggle"
            onClick={() => setSidebarOpen(true)}
            style={styles.mobileMenuButton}
            aria-label={t('nav.open')}
          >
            ☰
          </button>

          <div>
            <div style={styles.mobileTitle}>{t('app.name')}</div>
            <div style={styles.mobileSubtitle}>{roleLabel}</div>
          </div>
        </header>

        <div style={styles.content}>
          {children}
        </div>
      </section>
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
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 30,
    border: 'none',
    background: 'rgba(31, 26, 20, 0.35)',
  },
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 40,
    width: 280,
    background: '#1f1a14',
    color: '#fff',
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 180ms ease, transform 180ms ease',
    boxShadow: '18px 0 45px rgba(31, 26, 20, 0.18)',
  },
  sidebarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    marginBottom: 22,
    minHeight: 42,
  },
  brand: {
    fontSize: 17,
    fontWeight: 900,
    letterSpacing: '-0.03em',
  },
  user: {
    marginTop: 5,
    fontSize: 12,
    color: '#d8cfc3',
  },
  iconButton: {
    width: 40,
    height: 40,
    flex: '0 0 40px',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 14,
    background: 'rgba(255,255,255,0.08)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 24,
    lineHeight: 1,
    display: 'inline-grid',
    placeItems: 'center',
  },
  nav: {
    display: 'grid',
    gap: 8,
  },
  navButton: {
    width: '100%',
    minHeight: 44,
    border: 'none',
    borderRadius: 16,
    background: 'transparent',
    color: '#d8cfc3',
    padding: '12px 14px',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
    textAlign: 'left',
  },
  navButtonActive: {
    background: '#fff',
    color: '#1f1a14',
  },
  sidebarFooter: {
    marginTop: 'auto',
    display: 'grid',
    gap: 8,
  },
  footerText: {
    fontSize: 11,
    color: '#d8cfc3',
    paddingLeft: 4,
  },
  lang: {
    height: 42,
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 14,
    background: '#fff',
    color: '#1f1a14',
    padding: '0 10px',
    fontSize: 13,
    fontWeight: 800,
  },
  logout: {
    minHeight: 42,
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 14,
    background: 'rgba(255,255,255,0.08)',
    color: '#fff',
    padding: '0 12px',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
  },
  main: {
    minHeight: '100vh',
    marginLeft: 280,
    transition: 'margin-left 180ms ease',
  },
  mobileHeader: {
    position: 'sticky',
    top: 0,
    zIndex: 20,
    background: 'rgba(247, 243, 237, 0.94)',
    backdropFilter: 'blur(14px)',
    borderBottom: '1px solid #e6ded2',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  mobileMenuButton: {
    display: 'none',
    width: 42,
    height: 42,
    border: '1px solid #e6ded2',
    borderRadius: 14,
    background: '#fff',
    color: '#1f1a14',
    fontSize: 22,
    cursor: 'pointer',
  },
  mobileTitle: {
    fontSize: 15,
    fontWeight: 900,
    letterSpacing: '-0.03em',
  },
  mobileSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#8a7f72',
  },
  content: {
    width: '100%',
    maxWidth: 1180,
    margin: '0 auto',
    padding: 16,
  },
}