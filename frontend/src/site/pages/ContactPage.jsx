'use client'

import { useState } from 'react'
import SiteLayout from '../components/SiteLayout'
import { useSiteI18n } from '../i18n/SiteI18nProvider'

export default function ContactPage() {
  const { t } = useSiteI18n()
  const [submitted, setSubmitted] =
    useState(false)

  function handleSubmit(event) {
    event.preventDefault()
    setSubmitted(true)
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

            <p>
              {t('contact.subtitle')}
            </p>

            <div className="contact-decoration">
              <span>Lux</span>
              <strong>Lumina</strong>
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
                required
              />
            </label>

            <label>
              <span>{t('contact.email')}</span>
              <input
                type="email"
                name="email"
                required
              />
            </label>

            <label>
              <span>
                {t('contact.phone')}
              </span>
              <input
                type="tel"
                name="phone"
              />
            </label>

            <label>
              <span>
                {t('contact.message')}
              </span>

              <textarea
                name="message"
                rows="6"
                required
              />
            </label>

            <button
              type="submit"
              className="primary-button"
            >
              {t('contact.send')}
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