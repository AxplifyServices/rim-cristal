'use client'
import { useState, useEffect } from 'react'
import AdminShell from './AdminShell'
import { api } from '../../lib/api'

const EMPTY = { code: '', description: '', discount_type: 'percent', discount_value: '', min_order_amount: 0, max_uses: '', valid_from: '', valid_until: '' }

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm]       = useState(EMPTY)
  const [editing, setEditing] = useState(null) // coupon id being edited
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')

  const load = () => {
    setLoading(true)
    api.get('/coupons')
      .then(data => setCoupons(Array.isArray(data) ? data : (data.items || [])))
      .catch(() => setCoupons([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openCreate = () => { setForm(EMPTY); setEditing(null); setShowForm(true) }
  const openEdit   = (c)  => {
    setForm({
      code: c.code, description: c.description || '', discount_type: c.discount_type,
      discount_value: c.discount_value, min_order_amount: c.min_order_amount || 0,
      max_uses: c.max_uses ?? '', valid_from: c.valid_from ? c.valid_from.slice(0,10) : '',
      valid_until: c.valid_until ? c.valid_until.slice(0,10) : '',
    })
    setEditing(c.id)
    setShowForm(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        discount_value:    parseFloat(form.discount_value),
        min_order_amount:  parseFloat(form.min_order_amount || 0),
        max_uses:          form.max_uses ? parseInt(form.max_uses) : null,
        valid_from:        form.valid_from  || null,
        valid_until:       form.valid_until || null,
        is_active:         true,
      }
      if (editing) {
        await api.put(`/coupons/${editing}`, payload)
        setMsg('Coupon updated.')
      } else {
        await api.post('/coupons', payload)
        setMsg('Coupon created.')
      }
      setShowForm(false)
      setEditing(null)
      load()
    } catch (err) {
      setMsg('Error: ' + (err.message || 'Could not save coupon.'))
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(''), 4000)
    }
  }

  const deactivate = async (c) => {
    try {
      await api.put(`/coupons/${c.id}`, { ...c, is_active: false })
      load()
      setMsg(`"${c.code}" deactivated.`)
      setTimeout(() => setMsg(''), 3000)
    } catch { /* ignore */ }
  }

  const activate = async (c) => {
    try {
      await api.put(`/coupons/${c.id}`, { ...c, is_active: true })
      load()
      setMsg(`"${c.code}" activated.`)
      setTimeout(() => setMsg(''), 3000)
    } catch { /* ignore */ }
  }

  return (
    <AdminShell>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 600, marginBottom: 4 }}>Coupons</h1>
          <p style={{ fontSize: 13, color: '#888' }}>{coupons.length} coupon codes</p>
        </div>
        <button className="btn btn-dark" style={{ fontSize: 12 }} onClick={openCreate}>+ New Coupon</button>
      </div>

      {msg && (
        <div style={{ background: msg.startsWith('Error') ? '#fde8e8' : '#e6f4ee', border: `1px solid ${msg.startsWith('Error') ? '#ffc5c5' : '#b7ebc7'}`, padding: '10px 16px', fontSize: 13, color: msg.startsWith('Error') ? '#c0392b' : '#2e7d5a', marginBottom: 20 }}>
          {msg}
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <div style={{ background: 'white', border: '1px solid #e8e3dc', padding: 28, marginBottom: 28 }}>
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 600, marginBottom: 20 }}>{editing ? 'Edit Coupon' : 'New Coupon'}</h3>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6 }}>Code *</label>
                <input required className="field-input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SUMMER20" style={{ textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 700 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6 }}>Type *</label>
                <select className="field-input" value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))}>
                  <option value="percent">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6 }}>Value *</label>
                <input required type="number" min="0" step="0.01" className="field-input" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))} placeholder={form.discount_type === 'percent' ? '15' : '25.00'} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6 }}>Min. Order Amount</label>
                <input type="number" min="0" step="0.01" className="field-input" value={form.min_order_amount} onChange={e => setForm(f => ({ ...f, min_order_amount: e.target.value }))} placeholder="0.00" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6 }}>Max Uses (blank = unlimited)</label>
                <input type="number" min="1" className="field-input" value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} placeholder="unlimited" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6 }}>Description</label>
                <input className="field-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Summer sale coupon" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6 }}>Valid From</label>
                <input type="date" className="field-input" value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6 }}>Valid Until</label>
                <input type="date" className="field-input" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-dark" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Coupon'}</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setEditing(null) }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'white', border: '1px solid #e8e3dc' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 100px 80px 80px 80px 90px', padding: '12px 20px', borderBottom: '2px solid #e8e3dc', fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#aaa' }}>
          <span>Code</span><span>Description</span><span>Discount</span><span>Min Order</span><span>Uses</span><span>Expires</span><span>Actions</span>
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#aaa', fontSize: 13 }}>Loading…</div>
        ) : coupons.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#aaa', fontSize: 13 }}>No coupons yet. Create your first one!</div>
        ) : coupons.map(c => (
          <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 100px 80px 80px 80px 90px', padding: '14px 20px', borderBottom: '1px solid #f0ece6', alignItems: 'center', opacity: c.is_active ? 1 : 0.5 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 13.5, fontWeight: 700, color: '#b8963e', letterSpacing: '.05em' }}>{c.code}</span>
            <span style={{ fontSize: 13, color: '#666' }}>{c.description || '—'}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1814' }}>
              {c.discount_type === 'percent' ? `${c.discount_value}%` : `$${parseFloat(c.discount_value).toFixed(2)}`}
            </span>
            <span style={{ fontSize: 12, color: '#888' }}>${parseFloat(c.min_order_amount || 0).toFixed(0)}</span>
            <span style={{ fontSize: 12, color: '#888' }}>{c.uses_count || 0}{c.max_uses ? ` / ${c.max_uses}` : ''}</span>
            <span style={{ fontSize: 12, color: '#888' }}>{c.valid_until ? c.valid_until.slice(0,10) : '∞'}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => openEdit(c)} style={{ fontSize: 11, padding: '4px 8px', cursor: 'pointer', background: '#f5f3f0', border: '1px solid #e8e3dc', color: '#444' }}>Edit</button>
              {c.is_active
                ? <button onClick={() => deactivate(c)} style={{ fontSize: 11, padding: '4px 8px', cursor: 'pointer', background: '#fde8e8', border: '1px solid #ffc5c5', color: '#c0392b' }}>Deactivate</button>
                : <button onClick={() => activate(c)}   style={{ fontSize: 11, padding: '4px 8px', cursor: 'pointer', background: '#e6f4ee', border: '1px solid #b7ebc7', color: '#2e7d5a' }}>Activate</button>
              }
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  )
}
