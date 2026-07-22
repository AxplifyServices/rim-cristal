'use client'

import {
  useMemo,
  useState,
} from 'react'

import {
  useSiteI18n,
} from '../i18n/SiteI18nProvider'

function ChevronLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M15 18 9 12l6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m9 18 6-6-6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function getVisibleReviews(
  reviews,
  startIndex,
) {
  if (
    reviews.length <= 3
  ) {
    return reviews
  }

  return [0, 1, 2].map(
    offset =>
      reviews[
        (
          startIndex +
          offset
        ) %
          reviews.length
      ]
  )
}

export default function HomeReviewsCarousel({
  reviews = [],
}) {
  const { t } =
    useSiteI18n()

  const [
    startIndex,
    setStartIndex,
  ] = useState(0)

  const visibleReviews =
    useMemo(
      () =>
        getVisibleReviews(
          reviews,
          startIndex
        ),
      [
        reviews,
        startIndex,
      ]
    )

  function previous() {
    setStartIndex(
      current =>
        (
          current -
          1 +
          reviews.length
        ) %
        reviews.length
    )
  }

  function next() {
    setStartIndex(
      current =>
        (
          current + 1
        ) %
        reviews.length
    )
  }

  if (
    !Array.isArray(reviews) ||
    reviews.length === 0
  ) {
    return null
  }

  return (
    <section
      id="customer-reviews"
      className="section home-reviews-section"
      aria-labelledby="customer-reviews-title"
    >
      <div className="container">
        <div className="section-heading home-reviews-heading">
          <div>
            <span className="home-section-kicker">
              {t(
                'homeReviews.kicker'
              )}
            </span>

            <h2 id="customer-reviews-title">
              {t(
                'homeReviews.title'
              )}
            </h2>

            <p>
              {t(
                'homeReviews.subtitle'
              )}
            </p>
          </div>
        </div>

        <div className="home-reviews-carousel">
          {reviews.length > 3 && (
            <button
              type="button"
              className="home-reviews-arrow home-reviews-arrow-previous"
              aria-label={t(
                'shop.previous'
              )}
              onClick={
                previous
              }
            >
              <ChevronLeftIcon />
            </button>
          )}

          <div className="home-reviews-grid">
            {visibleReviews.map(
              review => (
                <article
                  key={review.id}
                  className="home-review-card"
                >
                  <div
                    className="home-review-stars"
                    aria-label={t(
                      'homeReviews.rating',
                      {
                        rating:
                          review.rating,
                      }
                    )}
                  >
                    {[1, 2, 3, 4, 5].map(
                      star => (
                        <span
                          key={star}
                          className={
                            star <=
                            review.rating
                              ? 'is-active'
                              : ''
                          }
                          aria-hidden="true"
                        >
                          ★
                        </span>
                      )
                    )}
                  </div>

                  <blockquote>
                    “{review.comment}”
                  </blockquote>

                  <footer>
                    <strong>
                      {review.name}
                    </strong>

                    {review.is_verified && (
                      <span>
                        {t(
                          'homeReviews.verified'
                        )}
                      </span>
                    )}
                  </footer>
                </article>
              )
            )}
          </div>

          {reviews.length > 3 && (
            <button
              type="button"
              className="home-reviews-arrow home-reviews-arrow-next"
              aria-label={t(
                'shop.next'
              )}
              onClick={next}
            >
              <ChevronRightIcon />
            </button>
          )}
        </div>
      </div>
    </section>
  )
}