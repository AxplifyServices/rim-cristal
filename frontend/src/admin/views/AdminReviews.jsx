'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import AdminShell from '../components/AdminShell'
import { adminApi } from '../lib/adminApi'

const STATUS_OPTIONS = [
  {
    value: '',
    label: 'Tous les avis',
  },
  {
    value: 'pending',
    label: 'En attente',
  },
  {
    value: 'approved',
    label: 'Approuvés',
  },
  {
    value: 'rejected',
    label: 'Rejetés',
  },
]

function getStatusLabel(status) {
  switch (status) {
    case 'approved':
      return 'Approuvé'

    case 'rejected':
      return 'Rejeté'

    default:
      return 'En attente'
  }
}

function getStatusClass(status) {
  switch (status) {
    case 'approved':
      return 'is-approved'

    case 'rejected':
      return 'is-rejected'

    default:
      return 'is-pending'
  }
}

function formatReviewDate(value) {
  if (!value) {
    return 'Date inconnue'
  }

  const date = new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return 'Date inconnue'
  }

  return new Intl.DateTimeFormat(
    'fr-FR',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    }
  ).format(date)
}

function StarRating({
  rating,
}) {
  const normalizedRating =
    Math.max(
      0,
      Math.min(
        Number(rating) || 0,
        5
      )
    )

  return (
    <div
      className="admin-review-rating"
      aria-label={`${normalizedRating} sur 5`}
    >
      {[1, 2, 3, 4, 5].map(
        star => (
          <span
            key={star}
            className={
              star <=
              normalizedRating
                ? 'is-active'
                : ''
            }
            aria-hidden="true"
          >
            ★
          </span>
        )
      )}

      <strong>
        {normalizedRating}/5
      </strong>
    </div>
  )
}

export default function AdminReviews() {
  const [reviews, setReviews] =
    useState([])

  const [status, setStatus] =
    useState('')

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState('')

  const [
    processingId,
    setProcessingId,
  ] = useState(null)

  const counts =
    useMemo(() => {
      return reviews.reduce(
        (
          accumulator,
          review
        ) => {
          accumulator.total += 1

          if (
            review.moderation_status ===
            'approved'
          ) {
            accumulator.approved += 1
          } else if (
            review.moderation_status ===
            'rejected'
          ) {
            accumulator.rejected += 1
          } else {
            accumulator.pending += 1
          }

          if (
            review.display_on_home
          ) {
            accumulator.home += 1
          }

          return accumulator
        },
        {
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          home: 0,
        }
      )
    }, [reviews])

  async function loadReviews(
    selectedStatus = status
  ) {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const query =
        selectedStatus
          ? `?status=${encodeURIComponent(
              selectedStatus
            )}`
          : ''

      const data =
        await adminApi.get(
          `/reviews${query}`
        )

      setReviews(
        Array.isArray(data)
          ? data
          : []
      )
    } catch (loadError) {
      setError(
        loadError?.message ||
          'Impossible de charger les avis clients.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReviews(status)
  }, [status])

  function updateReviewInState(
    updatedReview
  ) {
    setReviews(current =>
      current.map(review =>
        review.id ===
        updatedReview.id
          ? updatedReview
          : review
      )
    )
  }

  async function moderate(
    review,
    nextStatus
  ) {
    if (
      processingId !== null
    ) {
      return
    }

    setProcessingId(
      review.id
    )

    setError('')
    setSuccess('')

    try {
      const updated =
        await adminApi.patch(
          `/reviews/${review.id}/moderation`,
          {
            status:
              nextStatus,
          }
        )

      updateReviewInState(
        updated
      )

      setSuccess(
        nextStatus ===
        'approved'
          ? 'L’avis a été approuvé.'
          : 'L’avis a été rejeté.'
      )
    } catch (updateError) {
      setError(
        updateError?.message ||
          'La modération de l’avis a échoué.'
      )
    } finally {
      setProcessingId(null)
    }
  }

  async function toggleHome(
    review
  ) {
    if (
      processingId !== null
    ) {
      return
    }

    setProcessingId(
      review.id
    )

    setError('')
    setSuccess('')

    try {
      const nextVisibility =
        !review.display_on_home

      const updated =
        await adminApi.patch(
          `/reviews/${review.id}/home`,
          {
            display_on_home:
              nextVisibility,
          }
        )

      updateReviewInState(
        updated
      )

      setSuccess(
        nextVisibility
          ? 'L’avis est maintenant affiché sur la page d’accueil.'
          : 'L’avis a été retiré de la page d’accueil.'
      )
    } catch (updateError) {
      setError(
        updateError?.message ||
          'La visibilité de l’avis n’a pas pu être modifiée.'
      )
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <AdminShell>
      <div className="admin-page-heading admin-page-heading-with-action">
        <div>
          <h1>
            Avis clients
          </h1>

          <p>
            Modérez les avis reçus après les commandes et sélectionnez ceux affichés sur la page d’accueil.
          </p>
        </div>

        <label className="admin-review-filter">
          <span>
            Filtrer par statut
          </span>

          <select
            value={status}
            onChange={event =>
              setStatus(
                event.target.value
              )
            }
          >
            {STATUS_OPTIONS.map(
              option => (
                <option
                  key={
                    option.value
                  }
                  value={
                    option.value
                  }
                >
                  {option.label}
                </option>
              )
            )}
          </select>
        </label>
      </div>

      {error && (
        <div
          className="admin-feedback-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="admin-feedback-success"
          role="status"
        >
          {success}
        </div>
      )}

      <section className="admin-review-stats">
        <article>
          <span>
            Avis affichés
          </span>

          <strong>
            {counts.total}
          </strong>
        </article>

        <article>
          <span>
            En attente
          </span>

          <strong>
            {counts.pending}
          </strong>
        </article>

        <article>
          <span>
            Approuvés
          </span>

          <strong>
            {counts.approved}
          </strong>
        </article>

        <article>
          <span>
            Sur la home
          </span>

          <strong>
            {counts.home}
          </strong>
        </article>
      </section>

      {loading ? (
        <div className="admin-empty-card admin-review-loading">
          <span className="admin-review-loader" />

          <p>
            Chargement des avis…
          </p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="admin-empty-card admin-review-empty">
          <span aria-hidden="true">
            ☆
          </span>

          <h2>
            Aucun avis trouvé
          </h2>

          <p>
            Aucun avis ne correspond au filtre sélectionné.
          </p>
        </div>
      ) : (
        <section className="admin-reviews-list">
          {reviews.map(
            review => {
              const isProcessing =
                processingId ===
                review.id

              const isApproved =
                review.moderation_status ===
                'approved'

              const isRejected =
                review.moderation_status ===
                'rejected'

              return (
                <article
                  key={review.id}
                  className="admin-review-card"
                >
                  <header className="admin-review-card-header">
                    <div className="admin-review-author">
                      <div className="admin-review-avatar">
                        {String(
                          review.name ||
                            '?'
                        )
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <strong>
                          {review.name ||
                            'Client anonyme'}
                        </strong>

                        <span>
                          {formatReviewDate(
                            review.created_at
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="admin-review-statuses">
                      {review.is_verified && (
                        <span className="admin-review-verified">
                          Achat vérifié
                        </span>
                      )}

                      {review.display_on_home && (
                        <span className="admin-review-home-badge">
                          Visible sur la home
                        </span>
                      )}

                      <span
                        className={[
                          'admin-review-status',
                          getStatusClass(
                            review.moderation_status
                          ),
                        ].join(' ')}
                      >
                        {getStatusLabel(
                          review.moderation_status
                        )}
                      </span>
                    </div>
                  </header>

                  <StarRating
                    rating={
                      review.rating
                    }
                  />

                  <blockquote className="admin-review-comment">
                    {review.comment}
                  </blockquote>

                  {review.order ? (
                    <div className="admin-review-order">
                      <div>
                        <span>
                          Commande
                        </span>

                        <strong>
                          {
                            review.order
                              .order_number
                          }
                        </strong>
                      </div>

                      <div>
                        <span>
                          Client
                        </span>

                        <strong>
                          {
                            review.order
                              .customer_name ||
                            review.name ||
                            'Non renseigné'
                          }
                        </strong>
                      </div>

                      <div>
                        <span>
                          E-mail
                        </span>

                        <strong>
                          {
                            review.order
                              .email ||
                            'Non renseigné'
                          }
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <div className="admin-review-seed-notice">
                      Avis ajouté manuellement, sans commande associée.
                    </div>
                  )}

                  <footer className="admin-review-actions">
                    {!isApproved && (
                      <button
                        type="button"
                        className="admin-primary-button"
                        disabled={
                          isProcessing
                        }
                        onClick={() =>
                          moderate(
                            review,
                            'approved'
                          )
                        }
                      >
                        {isProcessing
                          ? 'Traitement…'
                          : 'Approuver'}
                      </button>
                    )}

                    {!isRejected && (
                      <button
                        type="button"
                        className="admin-danger-button"
                        disabled={
                          isProcessing
                        }
                        onClick={() =>
                          moderate(
                            review,
                            'rejected'
                          )
                        }
                      >
                        {isProcessing
                          ? 'Traitement…'
                          : 'Rejeter'}
                      </button>
                    )}

                    <button
                      type="button"
                      className={
                        review.display_on_home
                          ? 'admin-secondary-button'
                          : 'admin-primary-button'
                      }
                      disabled={
                        isProcessing ||
                        !isApproved
                      }
                      title={
                        !isApproved
                          ? 'Approuvez d’abord cet avis pour pouvoir l’afficher sur la home.'
                          : undefined
                      }
                      onClick={() =>
                        toggleHome(
                          review
                        )
                      }
                    >
                      {review.display_on_home
                        ? 'Retirer de la home'
                        : 'Afficher sur la home'}
                    </button>
                  </footer>
                </article>
              )
            }
          )}
        </section>
      )}
    </AdminShell>
  )
}