'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import fr from '../../../messages/site.fr.json'
import en from '../../../messages/site.en.json'

const dictionaries = {
  fr,
  en,
}

const LOCALE_STORAGE_KEY =
  'kaystia-home-locale'

const LEGACY_LOCALE_STORAGE_KEY =
  'lux-lumina-locale'

const storedLocale =
  localStorage.getItem(
    LOCALE_STORAGE_KEY
  ) ||
  localStorage.getItem(
    LEGACY_LOCALE_STORAGE_KEY
  )

const SiteI18nContext = createContext(null)

function getNestedValue(object, path) {
  return path
    .split('.')
    .reduce(
      (value, key) => value?.[key],
      object
    )
}

export function SiteI18nProvider({
  children,
}) {
  const [locale, setLocaleState] =
    useState('fr')

  useEffect(() => {
    const saved =
      window.localStorage.getItem(
        'lux-lumina-locale'
      )

    if (saved && dictionaries[saved]) {
      setLocaleState(saved)
      document.documentElement.lang = saved
    }
  }, [])

  const value = useMemo(() => {
    return {
      locale,

      setLocale(nextLocale) {
        const safeLocale =
          dictionaries[nextLocale]
            ? nextLocale
            : 'fr'

        setLocaleState(safeLocale)

        window.localStorage.setItem(
          'lux-lumina-locale',
          safeLocale
        )

        document.documentElement.lang =
          safeLocale
      },

t(key, variables = {}) {
  const translation =
    getNestedValue(
      dictionaries[locale],
      key
    ) ||
    getNestedValue(
      dictionaries.fr,
      key
    ) ||
    key

  if (typeof translation !== 'string') {
    return translation
  }

  return Object.entries(variables).reduce(
    (result, [variableName, variableValue]) => {
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
    <SiteI18nContext.Provider value={value}>
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