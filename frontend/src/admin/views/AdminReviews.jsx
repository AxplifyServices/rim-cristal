'use client'

import {
  useEffect,
  useState,
} from 'react'

import {
  adminApi,
} from '../lib/adminApi'

export default function AdminReviews() {
  const [reviews, setReviews] =
    useState([])

  const [status, setStatus] =
    useState('')

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  async function loadReviews(
    nextStatus = status
  ) {
    setLoading(true)
    setError('')

    try {
      const query =
        nextStatus
          ? `?status=${encodeURIComponent(
              nextStatus
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
          'Impossible de charger les avis.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReviews(status)
  }, [status])

  async function moderate(
    review,
    nextStatus
  ) {
    try {
      const updated =
        await adminApi.patch(
          `/reviews/${review.id}/moderation`,
          {
            status:
              nextStatus,
          }
        )

      setReviews(current =>
        current.map(item =>
          item.id ===
          updated.id
            ? updated
            : item
        )
      )
    } catch (updateError) {
      setError(
        updateError?.message ||
          'La modération a échoué.'
      )
    }
  }

  async function toggleHome(
    review
  ) {
    try {
      const updated =
        await adminApi.patch(
          `/reviews/${review.id}/home`,
          {
            display_on_home:
              !review.display_on_home,
          }
        )

      setReviews(current =>
        current.map(item =>
          item.id ===
          updated.id
            ? updated
            : item
        )
      )
    } catch (updateError) {
      setError(
        updateError?.message ||
          'La visibilité n’a pas pu être modifiée.'
      )
    }
  }

  return (
    <section>
      <div className="admin-page-heading">
        <div>
          <h1>
            Avis clients
          </h1>

          <p>
            Modérez les avis et sélectionnez ceux affichés sur la page d’accueil.
          </p>
        </div>

        <select
          value={status}
          onChange={event =>
            setStatus(
              event.target.value
            )
          }
        >
          <option value="">
            Tous les avis
          </option>

          <option value="pending">
            En attente
          </option>

          <option value="approved">
            Approuvés
          </option>

          <option value="rejected">
            Rejetés
          </option>
        </select>
      </div>

      {error && (
        <div className="admin-alert admin-alert-error">
          {error}
        </div>
      )}

      {loading ? (
        <p>
          Chargement…
        </p>
      ) : reviews.length === 0 ? (
        <div className="admin-empty-state">
          Aucun avis trouvé.
        </div>
      ) : (
        <div className="admin-reviews-list">
          {reviews.map(
            review => (
              <article
                key={review.id}
                className="admin-review-card"
              >
                <header>
                  <div>
                    <strong>
                      {review.name}
                    </strong>

                    <span>
                      {'★'.repeat(
                        review.rating
                      )}
                      {'☆'.repeat(
                        5 -
                          review.rating
                      )}
                    </span>
                  </div>

                  <span>
                    {
                      review
                        .moderation_status
                    }
                  </span>
                </header>

                <p>
                  {review.comment}
                </p>

                {review.order && (
                  <small>
                    Commande{' '}
                    {
                      review.order
                        .order_number
                    }
                    {' · '}
                    {
                      review.order
                        .email
                    }
                  </small>
                )}

                <div className="admin-review-actions">
                  <button
                    type="button"
                    onClick={() =>
                      moderate(
                        review,
                        'approved'
                      )
                    }
                  >
                    Approuver
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      moderate(
                        review,
                        'rejected'
                      )
                    }
                  >
                    Rejeter
                  </button>

                  <button
                    type="button"
                    disabled={
                      review.moderation_status !==
                      'approved'
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
                </div>
              </article>
            )
          )}
        </div>
      )}
    </section>
  )
}