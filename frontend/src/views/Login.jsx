'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login, register } = useAuth()
  const router = useRouter()
  const params = useSearchParams()
  const redirect = params.get('redirect') || '/profile'

  const [tab, setTab]       = useState('signin')   // 'signin' | 'register'
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  // Sign-in form
  const [email, setEmail]   = useState('')
  const [password, setPass] = useState('')

  // Register form
  const [reg, setReg] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' })

  const handleSignIn = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      router.push(redirect)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    if (reg.password !== reg.confirm) { setError('Passwords do not match'); return }
    if (reg.password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      await register({
        email: reg.email,
        password: reg.password,
        first_name: reg.firstName,
        last_name: reg.lastName,
      })
      router.push(redirect)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-wrap" style={{ maxWidth: 480, margin: '60px auto', padding: '0 20px' }}>
      {/* Tab switcher */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e8e3dc', marginBottom: 32 }}>
        {['signin', 'register'].map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setError('') }}
            style={{
              flex: 1, padding: '14px 0', background: 'none', border: 'none',
              borderBottom: tab === t ? '2px solid #1a1a1a' : '2px solid transparent',
              fontFamily: 'var(--serif)', fontSize: 17, cursor: 'pointer',
              color: tab === t ? '#1a1a1a' : '#888',
              marginBottom: -1,
            }}
          >
            {t === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        ))}
      </div>

      {error && (
        <div style={{
          background: '#fff0f0', border: '1px solid #ffc5c5', borderRadius: 6,
          padding: '12px 16px', marginBottom: 20, color: '#c0392b', fontSize: 14,
        }}>
          {error}
        </div>
      )}

      {/* ── Sign In ── */}
      {tab === 'signin' && (
        <form onSubmit={handleSignIn}>
          <div className="field-wrap">
            <label className="field-label">Email Address *</label>
            <input className="field-input" type="email" value={email}
              onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="field-wrap" style={{ marginTop: 16 }}>
            <label className="field-label">Password *</label>
            <input className="field-input" type="password" value={password}
              onChange={e => setPass(e.target.value)} required autoComplete="current-password" />
          </div>
          <div style={{ textAlign: 'right', marginTop: 8 }}>
            <Link href="/reset-password" style={{ fontSize: 13, color: '#888' }}>
              Forgot password?
            </Link>
          </div>
          <button
            type="submit"
            className="btn btn-dark"
            style={{ width: '100%', marginTop: 24 }}
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      )}

      {/* ── Register ── */}
      {tab === 'register' && (
        <form onSubmit={handleRegister}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="field-wrap">
              <label className="field-label">First Name *</label>
              <input className="field-input" value={reg.firstName}
                onChange={e => setReg(r => ({ ...r, firstName: e.target.value }))} required />
            </div>
            <div className="field-wrap">
              <label className="field-label">Last Name *</label>
              <input className="field-input" value={reg.lastName}
                onChange={e => setReg(r => ({ ...r, lastName: e.target.value }))} required />
            </div>
          </div>
          <div className="field-wrap" style={{ marginTop: 16 }}>
            <label className="field-label">Email Address *</label>
            <input className="field-input" type="email" value={reg.email}
              onChange={e => setReg(r => ({ ...r, email: e.target.value }))} required autoComplete="email" />
          </div>
          <div className="field-wrap" style={{ marginTop: 16 }}>
            <label className="field-label">Password * (min 8 chars)</label>
            <input className="field-input" type="password" value={reg.password}
              onChange={e => setReg(r => ({ ...r, password: e.target.value }))} required autoComplete="new-password" />
          </div>
          <div className="field-wrap" style={{ marginTop: 16 }}>
            <label className="field-label">Confirm Password *</label>
            <input className="field-input" type="password" value={reg.confirm}
              onChange={e => setReg(r => ({ ...r, confirm: e.target.value }))} required />
          </div>
          <button
            type="submit"
            className="btn btn-dark"
            style={{ width: '100%', marginTop: 24 }}
            disabled={loading}
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
          <p style={{ fontSize: 12, color: '#999', textAlign: 'center', marginTop: 16 }}>
            By creating an account, you agree to our{' '}
            <Link href="#" style={{ color: '#888' }}>Terms of Service</Link> and{' '}
            <Link href="#" style={{ color: '#888' }}>Privacy Policy</Link>.
          </p>
        </form>
      )}
    </div>
  )
}
