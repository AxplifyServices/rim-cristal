'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminApi } from '../lib/adminApi'
import { setAdminSession } from '../lib/adminAuth'
import { useAdminI18n } from '../i18n/AdminI18nProvider'

export default function AdminLogin() {
  const router = useRouter()
  const { t, locale, setLocale } = useAdminI18n()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await adminApi.post('/auth/login', {
        email,
        password,
      })

      if (!['admin', 'point_of_sale'].includes(data?.user?.role)) {
        throw new Error('Access denied')
      }

      setAdminSession(data)
      router.replace('/admin')
    } catch (err) {
      setError(err.message || t('auth.invalid'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.top}>
          <div>
            <div style={styles.brand}>{t('app.name')}</div>
            <div style={styles.subtitle}>{t('app.subtitle')}</div>
          </div>

          <select
            value={locale}
            onChange={e => setLocale(e.target.value)}
            style={styles.lang}
          >
            <option value="fr">FR</option>
            <option value="en">EN</option>
          </select>
        </div>

        <h1 style={styles.title}>{t('auth.loginTitle')}</h1>
        <p style={styles.text}>{t('auth.loginSubtitle')}</p>

        <form onSubmit={submit} style={styles.form}>
          <label style={styles.label}>
            {t('auth.email')}
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            {t('auth.password')}
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              required
              style={styles.input}
            />
          </label>

          {error && <div style={styles.error}>{error}</div>}

          <button disabled={loading} style={styles.button}>
            {loading ? '...' : t('auth.submit')}
          </button>
        </form>
      </section>
    </main>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f7f3ed',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: '#fff',
    border: '1px solid #e6ded2',
    borderRadius: 24,
    padding: 24,
    boxShadow: '0 24px 80px rgba(40, 30, 15, 0.08)',
  },
  top: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 34,
  },
  brand: {
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: '-0.03em',
    color: '#1f1a14',
  },
  subtitle: {
    fontSize: 12,
    color: '#8a7f72',
    marginTop: 4,
  },
  lang: {
    border: '1px solid #e6ded2',
    background: '#fff',
    borderRadius: 12,
    padding: '8px 10px',
    fontSize: 12,
  },
  title: {
    fontSize: 30,
    lineHeight: 1,
    margin: 0,
    color: '#1f1a14',
  },
  text: {
    marginTop: 10,
    marginBottom: 24,
    color: '#8a7f72',
    fontSize: 14,
  },
  form: {
    display: 'grid',
    gap: 14,
  },
  label: {
    display: 'grid',
    gap: 7,
    color: '#42392f',
    fontSize: 13,
    fontWeight: 600,
  },
  input: {
    height: 48,
    border: '1px solid #e6ded2',
    borderRadius: 14,
    padding: '0 14px',
    fontSize: 15,
    outline: 'none',
  },
  error: {
    background: '#fff0f0',
    color: '#c0392b',
    border: '1px solid #ffd0d0',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
  },
  button: {
    height: 50,
    border: 'none',
    borderRadius: 16,
    background: '#1f1a14',
    color: '#fff',
    fontWeight: 800,
    fontSize: 15,
    cursor: 'pointer',
  },
}