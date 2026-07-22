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

function ContactFeatureIcon({
  type,
}) {
  if (type === 'advice') {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M8.5 18.5h7" />
        <path d="M9.5 21h5" />
        <path d="M8.3 14.8C6.9 13.7 6 12 6 10a6 6 0 0 1 12 0c0 2-.9 3.7-2.3 4.8-.8.7-1.2 1.4-1.2 2.2h-5c0-.8-.4-1.5-1.2-2.2Z" />
      </svg>
    )
  }

  if (type === 'project') {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M4 19V8l8-4 8 4v11" />
        <path d="M8 19v-6h8v6" />
        <path d="M3 19h18" />
      </svg>
    )
  }

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M20 11.5a8 8 0 1 1-3.2-6.4" />
      <path d="m20 4-8.5 8.5L8 9" />
    </svg>
  )
}

export default function ContactPage() {
  const { t } = useSiteI18n()

  const [form, setForm] =
    useState(initialForm)

  const [
    submitting,
    setSubmitting,
  ] = useState(false)

  const [
    submitted,
    setSubmitted,
  ] = useState(false)

  const [error, setError] =
    useState('')

  function updateField(event) {
    const {
      name,
      value,
    } = event.target

    setForm(current => ({
      ...current,
      [name]: value,
    }))

    if (submitted) {
      setSubmitted(false)
    }

    if (error) {
      setError('')
    }
  }

  async function handleSubmit(
    event
  ) {
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
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify(
            form
          ),
        }
      )

      const data =
        await response
          .json()
          .catch(() => null)

      if (!response.ok) {
        const message =
          Array.isArray(
            data?.message
          )
            ? data.message.join(
                ', '
              )
            : data?.message

        throw new Error(
          message ||
            t('common.error')
        )
      }

      setForm(initialForm)
      setSubmitted(true)
    } catch (submitError) {
      setError(
        submitError.message ||
          t('common.error')
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SiteLayout>
      <main className="contact-page">
        <section className="contact-hero">
          <div className="container">
            <div className="contact-hero-inner">
              <div className="contact-hero-copy">
                <span className="contact-hero-eyebrow">
                  Casa Luxury Decor
                </span>

                <h1>
                  {t(
                    'contact.title'
                  )}
                </h1>

                <p>
                  {t(
                    'contact.subtitle'
                  )}
                </p>
              </div>

              <div
                className="contact-hero-monogram"
                aria-hidden="true"
              >
                <span>
                  Casa
                </span>

                <strong>
                  Luxury Decor
                </strong>
              </div>
            </div>
          </div>
        </section>

        <section className="contact-content-section">
          <div className="container contact-premium-grid">
            <aside className="contact-introduction">
              <div className="contact-introduction-heading">
                <span className="section-eyebrow">
                  {t(
                    'contact.eyebrow'
                  )}
                </span>

                <h2>
                  {t(
                    'contact.guidanceTitle'
                  )}
                </h2>

                <p>
                  {t(
                    'contact.guidanceText'
                  )}
                </p>
              </div>

              <div className="contact-feature-list">
                <article className="contact-feature">
                  <div className="contact-feature-icon">
                    <ContactFeatureIcon
                      type="advice"
                    />
                  </div>

                  <div>
                    <h3>
                      {t(
                        'contact.adviceTitle'
                      )}
                    </h3>

                    <p>
                      {t(
                        'contact.adviceText'
                      )}
                    </p>
                  </div>
                </article>

                <article className="contact-feature">
                  <div className="contact-feature-icon">
                    <ContactFeatureIcon
                      type="project"
                    />
                  </div>

                  <div>
                    <h3>
                      {t(
                        'contact.projectTitle'
                      )}
                    </h3>

                    <p>
                      {t(
                        'contact.projectText'
                      )}
                    </p>
                  </div>
                </article>

                <article className="contact-feature">
                  <div className="contact-feature-icon">
                    <ContactFeatureIcon
                      type="response"
                    />
                  </div>

                  <div>
                    <h3>
                      {t(
                        'contact.responseTitle'
                      )}
                    </h3>

                    <p>
                      {t(
                        'contact.responseText'
                      )}
                    </p>
                  </div>
                </article>
              </div>

              <div
                className="contact-signature"
                aria-hidden="true"
              >
                <span>
                  Casa Luxury
                </span>

                <strong>
                  Decor
                </strong>
              </div>
            </aside>

            <div className="contact-form-card">
              <div className="contact-form-header">
                <span>
                  {t(
                    'contact.formEyebrow'
                  )}
                </span>

                <h2>
                  {t(
                    'contact.formTitle'
                  )}
                </h2>

                <p>
                  {t(
                    'contact.formText'
                  )}
                </p>
              </div>

              <form
                className="contact-form"
                onSubmit={
                  handleSubmit
                }
              >
                <div className="contact-form-grid">
                  <label className="contact-field">
                    <span>
                      {t(
                        'contact.name'
                      )}
                      <small aria-hidden="true">
                        *
                      </small>
                    </span>

                    <div className="contact-input-shell">
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <circle
                          cx="12"
                          cy="8"
                          r="4"
                        />

                        <path d="M5 21a7 7 0 0 1 14 0" />
                      </svg>

                      <input
                        type="text"
                        name="name"
                        value={
                          form.name
                        }
                        onChange={
                          updateField
                        }
                        autoComplete="name"
                        required
                      />
                    </div>
                  </label>

                  <label className="contact-field">
                    <span>
                      {t(
                        'contact.email'
                      )}
                      <small aria-hidden="true">
                        *
                      </small>
                    </span>

                    <div className="contact-input-shell">
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <rect
                          x="3"
                          y="5"
                          width="18"
                          height="14"
                          rx="2"
                        />

                        <path d="m4 7 8 6 8-6" />
                      </svg>

                      <input
                        type="email"
                        name="email"
                        value={
                          form.email
                        }
                        onChange={
                          updateField
                        }
                        autoComplete="email"
                        required
                      />
                    </div>
                  </label>

                  <label className="contact-field">
                    <span>
                      {t(
                        'contact.phone'
                      )}
                    </span>

                    <div className="contact-input-shell">
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M7.2 3h3l1.5 4.2-2 1.7a16 16 0 0 0 5.4 5.4l1.7-2L21 13.8v3a3 3 0 0 1-3.2 3A15.8 15.8 0 0 1 4.2 6.2 3 3 0 0 1 7.2 3Z" />
                      </svg>

                      <input
                        type="tel"
                        name="phone"
                        value={
                          form.phone
                        }
                        onChange={
                          updateField
                        }
                        autoComplete="tel"
                      />
                    </div>
                  </label>

                  <label className="contact-field">
                    <span>
                      {t(
                        'contact.subject'
                      )}
                    </span>

                    <div className="contact-input-shell">
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M4 5h16v14H4z" />
                        <path d="M8 9h8M8 13h5" />
                      </svg>

                      <input
                        type="text"
                        name="subject"
                        value={
                          form.subject
                        }
                        onChange={
                          updateField
                        }
                      />
                    </div>
                  </label>
                </div>

                <label className="contact-field contact-message-field">
                  <span>
                    {t(
                      'contact.message'
                    )}
                    <small aria-hidden="true">
                      *
                    </small>
                  </span>

                  <div className="contact-textarea-shell">
                    <textarea
                      name="message"
                      rows="7"
                      value={
                        form.message
                      }
                      onChange={
                        updateField
                      }
                      required
                    />
                  </div>
                </label>

                {error && (
                  <div
                    className="contact-form-feedback is-error"
                    role="alert"
                  >
                    <span aria-hidden="true">
                      !
                    </span>

                    <p>
                      {error}
                    </p>
                  </div>
                )}

                {submitted && (
                  <div
                    className="contact-form-feedback is-success"
                    role="status"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="m5 12 4 4L19 6" />
                    </svg>

                    <p>
                      {t(
                        'contact.success'
                      )}
                    </p>
                  </div>
                )}

                <div className="contact-form-footer">
                  <p>
                    <span aria-hidden="true">
                      *
                    </span>

                    {t(
                      'contact.requiredFields'
                    )}
                  </p>

                  <button
                    type="submit"
                    className="contact-submit-button"
                    disabled={
                      submitting
                    }
                  >
                    <span>
                      {submitting
                        ? t(
                            'contact.sending'
                          )
                        : t(
                            'contact.send'
                          )}
                    </span>

                    {submitting ? (
                      <span
                        className="contact-submit-loader"
                        aria-hidden="true"
                      />
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M5 12h14" />
                        <path d="m14 7 5 5-5 5" />
                      </svg>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>
    </SiteLayout>
  )
}