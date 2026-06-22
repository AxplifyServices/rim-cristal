'use client'

import { useState } from 'react'
import SiteLayout from '../components/SiteLayout'
import { useSiteI18n } from '../i18n/SiteI18nProvider'

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3000/api'

const initialForm = {
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
}

export default function ContactPage() {
  const { t } = useSiteI18n()

  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  function updateField(event) {
    const { name, value } = event.target

    setForm(current => ({
      ...current,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (submitting) {
      return
    }

    setSubmitting(true)
    setSubmitted(false)
    setError('')

    try {
      const response = await fetch(
        `${API_BASE}/contacts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(form),
        }
      )

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        const message = Array.isArray(data?.message)
          ? data.message.join(', ')
          : data?.message

        throw new Error(
          message || t('common.error')
        )
      }

      setForm(initialForm)
      setSubmitted(true)
    } catch (submitError) {
      setError(
        submitError.message || t('common.error')
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SiteLayout>
      <section className="contact-section">
        <div className="container contact-grid">
          <div className="contact-introduction">
            <p className="section-eyebrow">
              {t('contact.eyebrow')}
            </p>

            <h1>{t('contact.title')}</h1>

            <p>{t('contact.subtitle')}</p>

            <div className="contact-decoration">
              <span>Rim</span>
              <strong>Cristal</strong>
            </div>
          </div>

          <form
            className="contact-form"
            onSubmit={handleSubmit}
          >
            <label>
              <span>{t('contact.name')}</span>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={updateField}
                required
              />
            </label>

            <label>
              <span>{t('contact.email')}</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={updateField}
                required
              />
            </label>

            <label>
              <span>{t('contact.phone')}</span>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={updateField}
              />
            </label>

            <label>
              <span>{t('contact.subject')}</span>
              <input
                type="text"
                name="subject"
                value={form.subject}
                onChange={updateField}
              />
            </label>

            <label>
              <span>{t('contact.message')}</span>

              <textarea
                name="message"
                rows="6"
                value={form.message}
                onChange={updateField}
                required
              />
            </label>

            {error && (
              <p className="form-error">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="primary-button"
              disabled={submitting}
            >
              {submitting
                ? t('contact.sending')
                : t('contact.send')}
            </button>

            {submitted && (
              <p className="form-success">
                {t('contact.success')}
              </p>
            )}
          </form>
        </div>
      </section>
    </SiteLayout>
  )
}