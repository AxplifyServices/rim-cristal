'use client'
import { useState } from 'react'

const INFO = [
  {
    icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    title: 'Email',
    value: 'hello@luxlumina.com',
    sub: 'We reply within 24 hours',
  },
  {
    icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.86 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.77 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
    title: 'Phone',
    value: '+1 (800) 586-4621',
    sub: 'Mon–Fri, 9 am – 6 pm EST',
  },
  {
    icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    title: 'Showroom',
    value: '123 Design District, New York, NY 10013',
    sub: 'By appointment · Mon–Sat 10 am–7 pm',
  },
  {
    icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    title: 'Support Hours',
    value: 'Monday – Friday',
    sub: '9:00 am – 6:00 pm Eastern Time',
  },
]

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

const SUBJECTS = ['Order Inquiry', 'Product Question', 'Return / Exchange', 'Trade & B2B', 'Press & Media', 'Other']

const INIT = { name: '', email: '', subject: SUBJECTS[0], message: '' }

export default function Contact() {
  const [form, setForm]       = useState(INIT)
  const [errors, setErrors]   = useState({})
  const [submitted, setSub]   = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  const upd = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const validate = () => {
    const e = {}
    if (!form.name.trim())                 e.name    = 'Name is required'
    if (!form.email.match(/.+@.+\..+/))   e.email   = 'Valid email required'
    if (form.message.trim().length < 20)   e.message = 'Please write at least 20 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    if (!validate()) return
    setSending(true)
    setSendError('')
    try {
      const res = await fetch(`${API}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:    form.name,
          email:   form.email,
          subject: form.subject,
          message: form.message,
        }),
      })
      if (!res.ok) throw new Error('Failed to send message.')
      setSub(true)
    } catch (err) {
      setSendError(err.message || 'Could not send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Page Header */}
      <div style={{ background: 'var(--black)', color: 'white', padding: '52px 0', textAlign: 'center' }}>
        <div className="page-wrap">
          <p className="overline" style={{ color: 'var(--gold)', marginBottom: 12 }}>We'd Love to Hear From You</p>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,4vw,3.2rem)', fontWeight: 600, marginBottom: 10 }}>Contact Us</h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,.5)' }}>Our team of lighting specialists is ready to help you find the perfect piece.</p>
        </div>
      </div>

      <div className="page-wrap">
        <div className="contact-grid">
          {/* Form */}
          <div className="contact-form-wrap">
            <h2>Send us a message</h2>
            <p>Whether you have a product question, need design advice, or have an order enquiry — we're here to help.</p>

            {!submitted ? (
              <form className="contact-form" onSubmit={handleSubmit}>
                {/* Name */}
                <div className="field-wrap">
                  <label className="field-label" htmlFor="c-name">Full Name *</label>
                  <input id="c-name" className={`field-input${errors.name ? ' error' : ''}`} value={form.name} onChange={e => upd('name', e.target.value)} placeholder="Your full name" />
                  {errors.name && <span className="field-error">{errors.name}</span>}
                </div>

                {/* Email */}
                <div className="field-wrap">
                  <label className="field-label" htmlFor="c-email">Email Address *</label>
                  <input id="c-email" type="email" className={`field-input${errors.email ? ' error' : ''}`} value={form.email} onChange={e => upd('email', e.target.value)} placeholder="you@example.com" />
                  {errors.email && <span className="field-error">{errors.email}</span>}
                </div>

                {/* Subject */}
                <div className="field-wrap">
                  <label className="field-label" htmlFor="c-subject">Subject</label>
                  <select id="c-subject" className="field-input" value={form.subject} onChange={e => upd('subject', e.target.value)}>
                    {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>

                {/* Message */}
                <div className="field-wrap">
                  <label className="field-label" htmlFor="c-msg">Message *</label>
                  <textarea
                    id="c-msg"
                    className={`field-input${errors.message ? ' error' : ''}`}
                    value={form.message}
                    onChange={e => upd('message', e.target.value)}
                    placeholder="How can we help you?"
                    rows={6}
                    style={{ resize: 'vertical', minHeight: 120 }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {errors.message ? <span className="field-error">{errors.message}</span> : <span />}
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{form.message.length} / 500</span>
                  </div>
                </div>

                {sendError && <p style={{ fontSize: 12.5, color: 'var(--danger)', margin: '8px 0 0' }}>{sendError}</p>}
                <button type="submit" className="btn btn-dark btn-full" style={{ marginTop: 4 }} disabled={sending}>
                  {sending ? 'Sending…' : 'Send Message →'}
                </button>

                <p style={{ fontSize: 11.5, color: 'var(--text-3)', textAlign: 'center', marginTop: 12 }}>
                  We typically respond within 24 business hours.
                </p>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '48px 24px', border: '1px solid var(--border)', background: 'var(--bg-alt)', marginTop: 8 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" style={{ width: 26, height: 26, strokeWidth: 2.5 }}>
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 600, marginBottom: 10 }}>Message Sent!</h3>
                <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 24 }}>
                  Thank you for reaching out, {form.name.split(' ')[0]}. We've received your message and will reply to <strong>{form.email}</strong> within 24 hours.
                </p>
                <button className="btn btn-outline" onClick={() => { setSub(false); setForm(INIT) }}>
                  Send Another Message
                </button>
              </div>
            )}
          </div>

          {/* Info panel */}
          <div className="contact-info">
            <h3>Get in Touch</h3>
            <p>Our lighting specialists are available to help you with product selection, order support, and trade enquiries.</p>

            <div className="c-info-items">
              {INFO.map(item => (
                <div key={item.title} className="c-info-item">
                  <div className="c-info-icon">{item.icon}</div>
                  <div>
                    <div className="c-info-title">{item.title}</div>
                    <div className="c-info-value">
                      {item.value}
                      {item.sub && <div style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 2 }}>{item.sub}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Map placeholder */}
            <div className="map-placeholder">
              <div style={{ textAlign: 'center' }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: 36, height: 36, strokeWidth: 1, opacity: .35, display: 'block', margin: '0 auto 10px' }}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                <p style={{ fontSize: 13, color: 'var(--text-3)' }}>123 Design District, New York, NY 10013</p>
              </div>
            </div>

            {/* Trade programme */}
            <div style={{ marginTop: 28, background: 'var(--black)', color: 'white', padding: '24px 22px' }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 10 }}>Trade Programme</p>
              <p style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Are you an interior designer or architect?</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', lineHeight: 1.7, marginBottom: 16 }}>
                Apply to the Lux Lumina Trade Programme for exclusive pricing, priority access to new collections, and a dedicated account manager.
              </p>
              <button className="btn btn-gold" style={{ fontSize: 11 }}>Apply for Trade Account</button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
