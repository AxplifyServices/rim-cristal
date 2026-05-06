'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { label: 'Tous', path: '/shop' },
  { label: 'Suspensions', path: '/shop/suspension' },
  { label: 'Appliques', path: '/shop/applique' },
  { label: 'Plafonniers', path: '/shop/plafonnier' },
  { label: 'Lampes de table', path: '/shop/lampe-de-table' },
  { label: 'Spots', path: '/shop/spot' },
  { label: 'Lampadaires', path: '/shop/lampadaire' },
  { label: 'Ampoules', path: '/shop/led' },
  { label: 'Extérieur', path: '/shop/exterieur' },
]

export default function Header() {
  const { totalQty, openDrawer } = useCart()
  const { user, isAuthenticated, logout } = useAuth()
  const [scrolled, setScrolled]  = useState(false)
  const [searchOpen, setSearch]  = useState(false)
  const [badgeBump, setBump]     = useState(false)
  const [menuOpen, setMenu]      = useState(false)
  const [accountOpen, setAcct]   = useState(false)
  const searchRef  = useRef(null)
  const accountRef = useRef(null)
  const prevQty    = useRef(totalQty)
  const router     = useRouter()
  const pathname   = usePathname()

  // sticky scroll
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // badge bump on cart change
  useEffect(() => {
    if (totalQty !== prevQty.current) {
      setBump(true)
      setTimeout(() => setBump(false), 380)
      prevQty.current = totalQty
    }
  }, [totalQty])

  // close search on outside click
  useEffect(() => {
    const fn = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearch(false)
      if (accountRef.current && !accountRef.current.contains(e.target)) setAcct(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const handleSearch = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      router.push(`/shop?q=${encodeURIComponent(e.target.value.trim())}`)
      setSearch(false)
      e.target.value = ''
    }
  }

  return (
    <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
      <div className="header-inner">
        <Link href="/" className="logo">Lux <em>Lumina</em></Link>

        <nav>
          <ul className="nav-list">
            {NAV.map(item => {
              const isActive = pathname === item.path || (item.path !== '/shop' && pathname.startsWith(item.path.split('?')[0]))
              return (
                <li key={item.label} className="nav-item">
                  <Link
                    href={item.path}
                    className={`nav-link${isActive ? ' active' : ''}${item.sale ? ' sale-link' : ''}`}
                  >
                    {item.label}
                  </Link>
                  {item.sub && (
                    <div className="nav-dropdown">
                      {item.sub.map(s => (
                        <Link key={s} href={item.path}>{s}</Link>
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="header-actions">
          {/* Search */}
          <div className="search-wrap" ref={searchRef}>
            <button className="hbtn" onClick={() => setSearch(v => !v)} aria-label="Search">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
            <div className={`search-popout${searchOpen ? ' open' : ''}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                autoFocus={searchOpen}
                type="text"
                placeholder="Rechercher une suspension, applique…"
                onKeyDown={handleSearch}
              />
            </div>
          </div>

          {/* Account */}
          {isAuthenticated ? (
            <div style={{ position: 'relative' }} ref={accountRef}>
              <button
                className="hbtn"
                aria-label="My Account"
                onClick={() => setAcct(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--gold-lt)', color: 'var(--gold)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, fontFamily: 'var(--serif)',
                  border: '1.5px solid var(--gold)',
                }}>
                  {`${(user?.first_name || '')[0] || ''}${(user?.last_name || '')[0] || ''}`.toUpperCase() || '?'}
                </div>
              </button>
              {accountOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                  background: 'white', border: '1px solid var(--border)',
                  boxShadow: '0 8px 32px rgba(0,0,0,.1)', minWidth: 200, zIndex: 200,
                  padding: '8px 0',
                }}>
                  <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid var(--border-lt)' }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.first_name} {user?.last_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{user?.email}</div>
                  </div>
                  {[
                    { label: 'My Profile',  href: '/profile' },
                    { label: 'My Orders',   href: '/profile' },
                    { label: 'Track Order', href: '/track' },
                    ...(user?.is_admin ? [{ label: 'Admin Dashboard', href: '/admin' }] : []),
                  ].map(item => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setAcct(false)}
                      style={{
                        display: 'block', padding: '9px 16px',
                        fontSize: 13, color: 'var(--text-1)',
                        textDecoration: 'none',
                      }}
                      className="header-dd-item"
                    >
                      {item.label}
                    </Link>
                  ))}
                  <div style={{ borderTop: '1px solid var(--border-lt)', marginTop: 4 }}>
                    <button
                      onClick={() => { setAcct(false); logout(); router.push('/') }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '9px 16px', fontSize: 13, color: 'var(--text-2)',
                        background: 'none', border: 'none', cursor: 'pointer',
                      }}
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button className="hbtn" aria-label="Sign In" onClick={() => router.push('/login')}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </button>
          )}

          {/* Cart */}
          <button className="hbtn" onClick={openDrawer} aria-label="Cart">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            <span className={`cart-badge${badgeBump ? ' bump' : ''}`}>{totalQty}</span>
          </button>

          {/* Hamburger */}
          <button className="hamburger" onClick={() => setMenu(v => !v)} aria-label="Menu">
            <span/><span/><span/>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ background: 'white', borderTop: '1px solid var(--border)', padding: '16px 20px' }}>
          {NAV.map(item => (
            <Link
              key={item.label}
              href={item.path}
              onClick={() => setMenu(false)}
              style={{ display: 'block', padding: '10px 0', borderBottom: '1px solid var(--border-lt)', fontSize: '13px', fontWeight: 500, letterSpacing: '.04em', textTransform: 'uppercase', color: item.sale ? 'var(--gold)' : 'var(--text-2)' }}
            >
              {item.label}
            </Link>
          ))}
          {isAuthenticated ? (
            <>
              <Link
                href="/profile"
                onClick={() => setMenu(false)}
                style={{ display: 'block', padding: '10px 0', borderBottom: '1px solid var(--border-lt)', fontSize: '13px', fontWeight: 500, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-2)' }}
              >
                My Account
              </Link>
              <Link
                href="/track"
                onClick={() => setMenu(false)}
                style={{ display: 'block', padding: '10px 0', borderBottom: '1px solid var(--border-lt)', fontSize: '13px', fontWeight: 500, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-2)' }}
              >
                Track Order
              </Link>
              <button
                onClick={() => { setMenu(false); logout(); router.push('/') }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 0', fontSize: '13px', fontWeight: 500, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setMenu(false)}
              style={{ display: 'block', padding: '10px 0', fontSize: '13px', fontWeight: 500, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-2)' }}
            >
              Sign In
            </Link>
          )}
        </div>
      )}
    </header>
  )
}
