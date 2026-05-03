'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

export default function ResetPassword() {
  const params = useSearchParams()
  const token  = params.get('token')

  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError]     = useState('')

  const handleForgot = async (e) => {
    e.preventDefault()
    setError(''); setMessage('')
    setLoading(true)
    try {
      await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setMessage("If that email exists, a reset link has been sent. Check your inbox.")
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setError(''); setMessage('')
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Reset failed')
      }
      setMessage('Password updated! You can now sign in.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-wrap" style={{ maxWidth: 440, margin: '60px auto', padding: '0 20px' }}>
      <h1 style={{ fontFamily: 'var(--serif)', fontSize: 28, marginBottom: 8 }}>
        {token ? 'Set New Password' : 'Reset Password'}
      </h1>
      <p style={{ color: '#888', marginBottom: 28, fontSize: 14 }}>
        {token
          ? 'Enter your new password below.'
          : "Enter your email and we'll send you a reset link."}
      </p>

      {error   && <div style={{ background: '#fff0f0', border: '1px solid #ffc5c5', borderRadius: 6, padding: '12px 16px', marginBottom: 20, color: '#c0392b', fontSize: 14 }}>{error}</div>}
      {message && <div style={{ background: '#f0fff4', border: '1px solid #b7ebc7', borderRadius: 6, padding: '12px 16px', marginBottom: 20, color: '#276749', fontSize: 14 }}>{message}</div>}

      {!token ? (
        <form onSubmit={handleForgot}>
          <div className="field-wrap">
            <label className="field-label">Email Address *</label>
            <input className="field-input" type="email" value={email}
              onChange={e => setEmail(e.target.value)} required />
          </div>
          <button className="btn btn-dark" style={{ width: '100%', marginTop: 24 }} disabled={loading}>
            {loading ? 'Sending…' : 'Send Reset Link'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleReset}>
          <div className="field-wrap">
            <label className="field-label">New Password * (min 8 chars)</label>
            <input className="field-input" type="password" value={password}
              onChange={e => setPass(e.target.value)} required />
          </div>
          <div className="field-wrap" style={{ marginTop: 16 }}>
            <label className="field-label">Confirm Password *</label>
            <input className="field-input" type="password" value={confirm}
              onChange={e => setConfirm(e.target.value)} required />
          </div>
          <button className="btn btn-dark" style={{ width: '100%', marginTop: 24 }} disabled={loading}>
            {loading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      )}

      <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#888' }}>
        <Link href="/login" style={{ color: '#1a1a1a' }}>← Back to Sign In</Link>
      </p>
    </div>
  )
}
