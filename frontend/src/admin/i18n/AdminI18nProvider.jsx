'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import fr from '../../../messages/fr.json'
import en from '../../../messages/en.json'

const dictionaries = {
  fr,
  en,
}

const LOCALE_STORAGE_KEY =
  'kaystia-admin-locale'

const LEGACY_LOCALE_STORAGE_KEY =
  'rim-admin-locale'

const AdminI18nContext =
  createContext(null)

function getNestedValue(
  object,
  path
) {
  return path
    .split('.')
    .reduce(
      (current, key) =>
        current?.[key],
      object
    )
}

export function AdminI18nProvider({
  children,
}) {
  const [locale, setLocaleState] =
    useState('fr')

  useEffect(() => {
    const currentLocale =
      window.localStorage.getItem(
        LOCALE_STORAGE_KEY
      )

    const legacyLocale =
      window.localStorage.getItem(
        LEGACY_LOCALE_STORAGE_KEY
      )

    const savedLocale =
      currentLocale ||
      legacyLocale

    const safeLocale =
      savedLocale &&
      dictionaries[savedLocale]
        ? savedLocale
        : 'fr'

    setLocaleState(safeLocale)

    window.localStorage.setItem(
      LOCALE_STORAGE_KEY,
      safeLocale
    )

    window.localStorage.removeItem(
      LEGACY_LOCALE_STORAGE_KEY
    )
  }, [])

  const dictionary =
    dictionaries[locale] ||
    dictionaries.fr

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
          LOCALE_STORAGE_KEY,
          safeLocale
        )

        window.localStorage.removeItem(
          LEGACY_LOCALE_STORAGE_KEY
        )
      },

      t(key) {
        return (
          getNestedValue(
            dictionary,
            key
          ) ||
          key
        )
      },
    }
  }, [locale, dictionary])

  return (
    <AdminI18nContext.Provider
      value={value}
    >
      {children}
    </AdminI18nContext.Provider>
  )
}

export function useAdminI18n() {
  const context =
    useContext(
      AdminI18nContext
    )

  if (!context) {
    throw new Error(
      'useAdminI18n must be used inside AdminI18nProvider'
    )
  }

  return context
}