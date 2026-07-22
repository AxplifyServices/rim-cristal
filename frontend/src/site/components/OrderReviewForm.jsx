'use client'

import {
  useEffect,
  useState,
} from 'react'

import {
  useSiteI18n,
} from '../i18n/SiteI18nProvider'

const API_BASE =
  process.env
    .NEXT_PUBLIC_API_URL ||
  'http://localhost:3000/api'

export default function OrderReviewForm({
  token,
}) {
  const { t } =
    useSiteI18n()

  const [name, setName] =
    useState('')

  const [rating, setRating] =
    useState(5)

  const [
    comment,
    setComment,
  ] = useState('')

  const [
    loadingInvitation,
    setLoadingInvitation,
  ] = useState(true)

  const [
    submitting,
    setSubmitting,
  ] = useState(false)

  const [
    alreadySubmitted,
    setAlreadySubmitted,
  ] = useState(false)

  const [
    submitted,
    setSubmitted,
  ] = useState(false)

  const [error, setError] =
    useState('')

  useEffect(() => {
    let cancelled =
      false

    async function loadInvitation() {
      if (!token) {
        setLoadingInvitation(
          false
        )
        return
      }

      try {
        const response =
          await fetch(
            `${API_BASE}/reviews/invitation/${encodeURIComponent(
              token
            )}`,
            {
              cache:
                'no-store',
            }
          )

        const data =
          await response
            .json()
            .catch(() => null)

        if (!response.ok) {
          throw new Error(
            data?.message ||
              t(
                'reviews.invalidInvitation'
              )
          )
        }

        if (cancelled) {
          return
        }

        setName(
          data.suggested_name ||
            ''
        )

        setAlreadySubmitted(
          Boolean(
            data.already_submitted
          )
        )
      } catch (
        invitationError
      ) {
        if (!cancelled) {
          setError(
            invitationError
              ?.message ||
              t(
                'reviews.invalidInvitation'
              )
          )
        }
      } finally {
        if (!cancelled) {
          setLoadingInvitation(
            false
          )
        }
      }
    }

    loadInvitation()

    return () => {
      cancelled = true
    }
  }, [token, t])

  async function handleSubmit(
    event
  ) {
    event.preventDefault()

    if (
      submitting ||
      submitted
    ) {
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const response =
        await fetch(
          `${API_BASE}/reviews`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                token,
                name,
                rating,
                comment,
              }),
          }
        )

      const data =
        await response
          .json()
          .catch(() => null)

      if (!response.ok) {
        throw new Error(
          Array.isArray(
            data?.message
          )
            ? data.message.join(
                ', '
              )
            : data?.message ||
                t(
                  'reviews.submitError'
                )
        )
      }

      setSubmitted(true)
    } catch (submitError) {
      setError(
        submitError?.message ||
          t(
            'reviews.submitError'
          )
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (
    !token ||
    loadingInvitation
  ) {
    return null
  }

  if (alreadySubmitted) {
    return (
      <div className="order-review-feedback">
        {t(
          'reviews.alreadySubmitted'
        )}
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="order-review-feedback is-success">
        <strong>
          {t(
            'reviews.thankYou'
          )}
        </strong>

        <p>
          {t(
            'reviews.moderationNotice'
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="order-review-card">
      <div className="order-review-heading">
        <span>
          {t(
            'reviews.kicker'
          )}
        </span>

        <h2>
          {t(
            'reviews.formTitle'
          )}
        </h2>

        <p>
          {t(
            'reviews.formSubtitle'
          )}
        </p>
      </div>

      <form
        onSubmit={
          handleSubmit
        }
        className="order-review-form"
      >
        <label>
          <span>
            {t(
              'reviews.name'
            )}
          </span>

          <input
            type="text"
            value={name}
            minLength={2}
            maxLength={160}
            required
            autoComplete="name"
            onChange={event =>
              setName(
                event.target
                  .value
              )
            }
          />
        </label>

        <fieldset className="review-rating-fieldset">
          <legend>
            {t(
              'reviews.rating'
            )}
          </legend>

          <div className="review-rating-buttons">
            {[1, 2, 3, 4, 5].map(
              value => (
                <button
                  key={value}
                  type="button"
                  className={
                    value <=
                    rating
                      ? 'review-star is-active'
                      : 'review-star'
                  }
                  aria-label={t(
                    'reviews.ratingValue',
                    {
                      rating:
                        value,
                    }
                  )}
                  onClick={() =>
                    setRating(
                      value
                    )
                  }
                >
                  ★
                </button>
              )
            )}
          </div>
        </fieldset>

        <label>
          <span>
            {t(
              'reviews.comment'
            )}
          </span>

          <textarea
            value={comment}
            minLength={10}
            maxLength={1500}
            required
            rows={5}
            onChange={event =>
              setComment(
                event.target
                  .value
              )
            }
          />
        </label>

        {error && (
          <p
            className="form-error"
            role="alert"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          className="primary-button"
          disabled={submitting}
        >
          {submitting
            ? t(
                'common.loading'
              )
            : t(
                'reviews.submit'
              )}
        </button>
      </form>
    </div>
  )
}