'use client'

import {
  getImageProps,
} from 'next/image'
import Link from 'next/link'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useSiteI18n } from '../i18n/SiteI18nProvider'


const AUTOPLAY_DELAY = 6000
const SWIPE_THRESHOLD = 45

function clamp(
  value,
  min,
  max
) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return min
  }

  return Math.min(
    max,
    Math.max(min, parsed)
  )
}

function BrochureImage({
  brochure,
  priority = false,
}) {
  const desktopZoom = clamp(
    brochure.desktopZoom,
    0.25,
    4
  )

  const mobileZoom = clamp(
    brochure.mobileZoom,
    0.25,
    4
  )

  const altText =
    brochure.altTextFr ||
    brochure.altTextEn ||
    ''

  const sharedStyle = {
    '--brochure-desktop-fit':
      brochure.desktopFit,

    '--brochure-desktop-position-x':
      `${clamp(
        brochure.desktopPositionX,
        0,
        100
      )}%`,

    '--brochure-desktop-position-y':
      `${clamp(
        brochure.desktopPositionY,
        0,
        100
      )}%`,

    '--brochure-desktop-zoom':
      desktopZoom,

    '--brochure-mobile-fit':
      brochure.mobileFit,

    '--brochure-mobile-position-x':
      `${clamp(
        brochure.mobilePositionX,
        0,
        100
      )}%`,

    '--brochure-mobile-position-y':
      `${clamp(
        brochure.mobilePositionY,
        0,
        100
      )}%`,

    '--brochure-mobile-zoom':
      mobileZoom,
  }

  const {
    props: desktopImageProps,
  } = getImageProps({
    src:
      brochure.imageUrl,
    alt: altText,
    fill: true,
    sizes: '100vw',
    quality: 82,
    priority,
  })

  const mobileImage =
    brochure.mobileImageUrl
      ? getImageProps({
          src:
            brochure.mobileImageUrl,
          alt: altText,
          fill: true,
          sizes: '100vw',
          quality: 78,
          priority,
        }).props
      : null

  return (
    <picture className="home-brochure-picture">
      {mobileImage && (
        <source
          media="(max-width: 760px)"
          srcSet={
            mobileImage.srcSet
          }
          sizes={
            mobileImage.sizes
          }
        />
      )}

      <img
        {...desktopImageProps}
        alt={altText}
        draggable={false}
        fetchPriority={
          priority
            ? 'high'
            : 'auto'
        }
        loading={
          priority
            ? 'eager'
            : 'lazy'
        }
        className="home-brochure-image"
        style={sharedStyle}
      />
    </picture>
  )
}

function BrochureContent({
  brochure,
  locale,
  clickable,
  priority,
}) {
  const image = (
    <BrochureImage
      brochure={brochure}
      priority={priority}
    />
  )

  if (
    !clickable ||
    !brochure.linkUrl
  ) {
    return (
      <div className="home-brochure-link is-neutral">
        {image}
      </div>
    )
  }

  const isInternalLink =
    brochure.linkUrl.startsWith('/') &&
    !brochure.linkUrl.startsWith('//')

  if (isInternalLink) {
    return (
      <Link
        href={brochure.linkUrl}
        className="home-brochure-link"
        aria-label={
brochure.altTextFr ||
brochure.altTextEn ||
''
        }
      >
        {image}
      </Link>
    )
  }

  return (
    <a
      href={brochure.linkUrl}
      target={
        brochure.linkTarget
      }
      rel={
        brochure.linkTarget ===
        '_blank'
          ? 'noopener noreferrer'
          : undefined
      }
      className="home-brochure-link"
      aria-label={
        locale === 'en'
          ? brochure.altTextEn ||
            brochure.altTextFr
          : brochure.altTextFr ||
            brochure.altTextEn
      }
    >
      {image}
    </a>
  )
}

export default function HomeBrochureCarousel({
  initialBrochures = [],
  initialLoadFailed = false,
}) {
  const {
    locale,
    t,
  } = useSiteI18n()

  const brochures =
    Array.isArray(
      initialBrochures
    )
      ? initialBrochures
      : []

  const [activeIndex, setActiveIndex] =
    useState(0)

  const loading = false

  const error =
    initialLoadFailed
      ? t(
          'home.brochuresLoadError'
        )
      : ''

  const [paused, setPaused] =
    useState(false)

  const touchStartXRef =
    useRef(null)

  const touchStartYRef =
    useRef(null)

  const carouselRef =
    useRef(null)

  const hasSeveralBrochures =
    brochures.length > 1

  const goToSlide = useCallback(
    nextIndex => {
      if (
        brochures.length === 0
      ) {
        return
      }

      const normalizedIndex =
        (
          nextIndex +
          brochures.length
        ) % brochures.length

      setActiveIndex(
        normalizedIndex
      )
    },
    [brochures.length]
  )

  const showPrevious =
    useCallback(() => {
      goToSlide(activeIndex - 1)
    }, [
      activeIndex,
      goToSlide,
    ])

  const showNext =
    useCallback(() => {
      goToSlide(activeIndex + 1)
    }, [
      activeIndex,
      goToSlide,
    ])

  useEffect(() => {
    if (
      !hasSeveralBrochures ||
      paused
    ) {
      return undefined
    }

    const mediaQuery =
      window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      )

    if (mediaQuery.matches) {
      return undefined
    }

    const intervalId =
      window.setInterval(() => {
        setActiveIndex(
          currentIndex =>
            (
              currentIndex + 1
            ) % brochures.length
        )
      }, AUTOPLAY_DELAY)

    return () => {
      window.clearInterval(
        intervalId
      )
    }
  }, [
    brochures.length,
    hasSeveralBrochures,
    paused,
  ])

  useEffect(() => {
    function handleVisibilityChange() {
      setPaused(
        document.hidden
      )
    }

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    )

    return () => {
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      )
    }
  }, [])

  function handleTouchStart(
    event
  ) {
    const firstTouch =
      event.touches[0]

    touchStartXRef.current =
      firstTouch.clientX

    touchStartYRef.current =
      firstTouch.clientY
  }

  function handleTouchEnd(
    event
  ) {
    if (
      touchStartXRef.current ===
        null ||
      touchStartYRef.current ===
        null
    ) {
      return
    }

    const changedTouch =
      event.changedTouches[0]

    const distanceX =
      changedTouch.clientX -
      touchStartXRef.current

    const distanceY =
      changedTouch.clientY -
      touchStartYRef.current

    touchStartXRef.current =
      null

    touchStartYRef.current =
      null

    if (
      Math.abs(distanceY) >
      Math.abs(distanceX)
    ) {
      return
    }

    if (
      Math.abs(distanceX) <
      SWIPE_THRESHOLD
    ) {
      return
    }

    if (distanceX > 0) {
      showPrevious()
    } else {
      showNext()
    }
  }

  function handleKeyDown(
    event
  ) {
    if (
      !hasSeveralBrochures
    ) {
      return
    }

    if (
      event.key ===
      'ArrowLeft'
    ) {
      event.preventDefault()
      showPrevious()
    }

    if (
      event.key ===
      'ArrowRight'
    ) {
      event.preventDefault()
      showNext()
    }
  }

  if (loading) {
    return (
      <section
        className="home-brochure-section is-loading"
        aria-label={t(
          'home.brochuresTitle'
        )}
      >
        <div className="home-brochure-skeleton" />
      </section>
    )
  }

  if (
    error ||
    brochures.length === 0
  ) {
    return (
      <section className="home-brochure-fallback">
        <div className="container home-brochure-fallback-inner">
          <p className="section-eyebrow">
            {t('home.eyebrow')}
          </p>

          <h1>
            {t('home.title')}
          </h1>

          <p>
            {error ||
              t(
                'home.noBrochures'
              )}
          </p>

          <Link
            href="/shop"
            className="primary-button"
          >
            {t('home.heroCta')}
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section
      ref={carouselRef}
      className="home-brochure-section"
      aria-roledescription="carousel"
      aria-label={t(
        'home.brochuresTitle'
      )}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => {
        setPaused(true)
      }}
      onMouseLeave={() => {
        setPaused(false)
      }}
      onFocusCapture={() => {
        setPaused(true)
      }}
      onBlurCapture={event => {
        if (
          !event.currentTarget.contains(
            event.relatedTarget
          )
        ) {
          setPaused(false)
        }
      }}
      onTouchStart={
        handleTouchStart
      }
      onTouchEnd={handleTouchEnd}
    >
      <h1 className="sr-only">
        {t('home.title')}
      </h1>

      <div className="home-brochure-track">
        {brochures.map(
          (
            brochure,
            index
          ) => {
            const isActive =
              index === activeIndex

            return (
              <article
                key={brochure.id}
                className={
                  isActive
                    ? 'home-brochure-slide is-active'
                    : 'home-brochure-slide'
                }
                aria-hidden={
                  !isActive
                }
                aria-roledescription="slide"
                aria-label={t(
                  'home.brochurePosition',
                  {
                    current:
                      index + 1,

                    total:
                      brochures.length,
                  }
                )}
              >
                <BrochureContent
                  brochure={
                    brochure
                  }
                  locale={locale}
                  clickable={
                    isActive
                  }
                  priority={
                    index === 0
                  }
                />
              </article>
            )
          }
        )}
      </div>

      {hasSeveralBrochures && (
        <>
          <button
            type="button"
            className="home-brochure-arrow home-brochure-arrow-previous"
            onClick={showPrevious}
            aria-label={t(
              'home.previousSlide'
            )}
          >
            <span aria-hidden="true">
              ‹
            </span>
          </button>

          <button
            type="button"
            className="home-brochure-arrow home-brochure-arrow-next"
            onClick={showNext}
            aria-label={t(
              'home.nextSlide'
            )}
          >
            <span aria-hidden="true">
              ›
            </span>
          </button>

          <div
            className="home-brochure-dots"
            role="group"
            aria-label={t(
              'home.brochureNavigation'
            )}
          >
            {brochures.map(
              (
                brochure,
                index
              ) => (
                <button
                  key={
                    brochure.id
                  }
                  type="button"
                  className={
                    index ===
                    activeIndex
                      ? 'home-brochure-dot is-active'
                      : 'home-brochure-dot'
                  }
                  onClick={() => {
                    goToSlide(
                      index
                    )
                  }}
                  aria-label={t(
                    'home.goToSlide',
                    {
                      number:
                        index + 1,
                    }
                  )}
                  aria-current={
                    index ===
                    activeIndex
                      ? 'true'
                      : undefined
                  }
                />
              )
            )}
          </div>
        </>
      )}

      {brochures[activeIndex]
        ?.linkUrl && (
        <span className="home-brochure-click-hint">
          {t(
            'home.openBrochure'
          )}
        </span>
      )}
    </section>
  )
}