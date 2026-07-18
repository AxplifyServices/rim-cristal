'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import ar from '../../../messages/site.ar.json'
import fr from '../../../messages/site.fr.json'

const dictionaries = {
  fr,
  ar,
}

const LOCALE_STORAGE_KEY =
  'kaystia-home-locale'

const LEGACY_LOCALE_STORAGE_KEYS = [
  'lux-lumina-locale',
]

const SiteI18nContext =
  createContext(null)

function getNestedValue(
  object,
  path
) {
  return path
    .split('.')
    .reduce(
      (value, key) =>
        value?.[key],
      object
    )
}

function applyDocumentLocale(
  locale
) {
  const isArabic =
    locale === 'ar'

  document.documentElement.lang =
    locale

  document.documentElement.dir =
    isArabic
      ? 'rtl'
      : 'ltr'

  document.body.dir =
    isArabic
      ? 'rtl'
      : 'ltr'

  document.body.dataset.locale =
    locale
}

export function SiteI18nProvider({
  children,
}) {
  const [locale, setLocaleState] =
    useState('fr')

  useEffect(() => {
    const currentLocale =
      window.localStorage.getItem(
        LOCALE_STORAGE_KEY
      )

    const safeLocale =
      currentLocale &&
      dictionaries[currentLocale]
        ? currentLocale
        : 'fr'

    setLocaleState(safeLocale)
    applyDocumentLocale(safeLocale)

    window.localStorage.setItem(
      LOCALE_STORAGE_KEY,
      safeLocale
    )

    for (
      const legacyKey
      of LEGACY_LOCALE_STORAGE_KEYS
    ) {
      window.localStorage.removeItem(
        legacyKey
      )
    }
  }, [])

  const value = useMemo(() => {
    return {
      locale,

      direction:
        locale === 'ar'
          ? 'rtl'
          : 'ltr',

      setLocale(nextLocale) {
        const safeLocale =
          dictionaries[nextLocale]
            ? nextLocale
            : 'fr'

        setLocaleState(safeLocale)

        window.localStorage.setItem(
          LOCALE_STORAGE_KEY,
          safeLocale
        )

        applyDocumentLocale(
          safeLocale
        )
      },

      t(key, variables = {}) {
        const translation =
          getNestedValue(
            dictionaries[locale],
            key
          ) ??
          getNestedValue(
            dictionaries.fr,
            key
          ) ??
          key

        if (
          typeof translation !==
          'string'
        ) {
          return translation
        }

        return Object.entries(
          variables
        ).reduce(
          (
            result,
            [
              variableName,
              variableValue,
            ]
          ) => {
            return result.replaceAll(
              `{${variableName}}`,
              String(variableValue)
            )
          },
          translation
        )
      },
    }
  }, [locale])

  return (
    <SiteI18nContext.Provider
      value={value}
    >
      {children}
    </SiteI18nContext.Provider>
  )
}

export function useSiteI18n() {
  const context =
    useContext(SiteI18nContext)

  if (!context) {
    throw new Error(
      'useSiteI18n doit être utilisé dans SiteI18nProvider'
    )
  }

  return context
}