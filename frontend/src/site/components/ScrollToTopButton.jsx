'use client'

import {
  useEffect,
  useState,
} from 'react'

import { useSiteI18n } from '../i18n/SiteI18nProvider'

const VISIBILITY_THRESHOLD = 520

function ArrowUpIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="m6 14 6-6 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function ScrollToTopButton() {
  const { t } = useSiteI18n()
  const [visible, setVisible] =
    useState(false)

  useEffect(() => {
    let frameId = null

    const updateVisibility = () => {
      frameId = null

      setVisible(
        window.scrollY >=
          VISIBILITY_THRESHOLD
      )
    }

    const handleScroll = () => {
      if (frameId !== null) {
        return
      }

      frameId = window.requestAnimationFrame(
        updateVisibility
      )
    }

    updateVisibility()

    window.addEventListener(
      'scroll',
      handleScroll,
      { passive: true }
    )

    return () => {
      window.removeEventListener(
        'scroll',
        handleScroll
      )

      if (frameId !== null) {
        window.cancelAnimationFrame(
          frameId
        )
      }
    }
  }, [])

  const scrollToTop = () => {
    const reduceMotion =
      window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: reduceMotion
        ? 'auto'
        : 'smooth',
    })
  }

  return (
    <button
      type="button"
      className={[
        'scroll-to-top-button',
        visible ? 'is-visible' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={scrollToTop}
      aria-label={t(
        'common.scrollToTop'
      )}
      title={t(
        'common.scrollToTop'
      )}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
    >
      <ArrowUpIcon />
    </button>
  )
}
