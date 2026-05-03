'use client'
import { useState, useEffect } from 'react'
import AdminShell from './AdminShell'
import { api } from '../../lib/api'

export default function AdminMessages() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')
  const [expanded, setExp]      = useState(null)

  useEffect(() => {
    setLoading(true)
    api.get('/contact')
      .then(data => setMessages(Array.isArray(data) ? data : (data.items || [])))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false))
  }, [])

  const markRead = async (id) => {
    try {
      await api.patch(`/contact/${id}/read`, {})
      setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m))
    } catch { /* ignore */ }
  }

  const handleExpand = (id) => {
    setExp(prev => {
      if (prev === id) return null
      // Mark as read when opening
      const msg = messages.find(m => m.id === id)
      if (msg && !msg.is_read) markRead(id)
      return id
    })
  }

  const filtered = messages.filter(m => {
    if (filter === 'unread') return !m.is_read
    if (filter === 'read')   return m.is_read
    return true
  })

  const unreadCount = messages.filter(m => !m.is_read).length

  const formatDate = (d) => {
    try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
    catch { return d }
  }

  return (
    <AdminShell>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 600, marginBottom: 4 }}>Messages</h1>
          <p style={{ fontSize: 13, color: '#888' }}>
            {messages.length} total · <span style={{ color: '#b45309', fontWeight: 600 }}>{unreadCount} unread</span>
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, border: '1px solid #e8e3dc', background: 'white', width: 'fit-content' }}>
        {[['all','All'], ['unread','Unread'], ['read','Read']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            style={{
              padding: '9px 20px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              background: filter === val ? '#1a1814' : 'white',
              color: filter === val ? 'white' : '#555',
              border: 'none', borderRight: val !== 'read' ? '1px solid #e8e3dc' : 'none',
            }}
          >
            {label} {val === 'unread' && unreadCount > 0 && `(${unreadCount})`}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid #e8e3dc', background: 'white' }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#aaa', fontSize: 13 }}>Loading messages…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#aaa', fontSize: 13 }}>No messages found.</div>
        ) : filtered.map(msg => (
          <div key={msg.id} style={{ borderBottom: '1px solid #f0ece6' }}>
            <div
              onClick={() => handleExpand(msg.id)}
              style={{
                display: 'grid', gridTemplateColumns: '16px 1fr 160px 140px', gap: 16, padding: '16px 20px',
                alignItems: 'center', cursor: 'pointer',
                background: !msg.is_read ? '#fffdf8' : 'white',
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: !msg.is_read ? '#b8963e' : 'transparent', flexShrink: 0 }} />
              <div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: msg.is_read ? 500 : 700 }}>{msg.name}</span>
                  <span style={{ fontSize: 11.5, color: '#aaa' }}>{msg.email}</span>
                  <span style={{ fontSize: 11, background: '#f0ece6', color: '#888', padding: '1px 7px' }}>{msg.subject}</span>
                </div>
                <div style={{ fontSize: 13, color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {msg.message?.slice(0, 100)}{msg.message?.length > 100 ? '…' : ''}
                </div>
              </div>
              <span style={{ fontSize: 12, color: '#aaa', textAlign: 'right' }}>{formatDate(msg.created_at)}</span>
              <div style={{ textAlign: 'right' }}>
                {!msg.is_read && (
                  <button
                    onClick={e => { e.stopPropagation(); markRead(msg.id) }}
                    style={{ fontSize: 11, padding: '4px 10px', cursor: 'pointer', background: '#f0ece6', border: '1px solid #e8e3dc', color: '#555' }}
                  >
                    Mark Read
                  </button>
                )}
                {msg.is_read && <span style={{ fontSize: 11, color: '#aaa' }}>✓ Read</span>}
              </div>
            </div>

            {expanded === msg.id && (
              <div style={{ background: '#faf8f5', borderTop: '1px solid #e8e3dc', padding: '20px 24px' }}>
                <div style={{ marginBottom: 12, fontSize: 12, color: '#aaa' }}>
                  From: <strong style={{ color: '#444' }}>{msg.name}</strong> &lt;{msg.email}&gt;
                  {' · '}
                  Subject: <strong style={{ color: '#444' }}>{msg.subject}</strong>
                </div>
                <div style={{ fontSize: 14, color: '#333', lineHeight: 1.8, whiteSpace: 'pre-wrap', background: 'white', border: '1px solid #e8e3dc', padding: '16px 18px' }}>
                  {msg.message}
                </div>
                <div style={{ marginTop: 14 }}>
                  <a
                    href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject)}`}
                    className="btn btn-dark"
                    style={{ fontSize: 12, display: 'inline-block' }}
                  >
                    Reply via Email
                  </a>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </AdminShell>
  )
}
