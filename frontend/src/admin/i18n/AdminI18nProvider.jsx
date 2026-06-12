'use client'

import { createContext, useContext, useMemo, useState } from 'react'
import fr from '../../../messages/fr.json'
import en from '../../../messages/en.json'

const dictionaries = {
  fr,
  en,
}

const AdminI18nContext = createContext(null)

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

export function AdminI18nProvider({ children }) {
  const [locale, setLocale] = useState(() => {
    if (typeof window === 'undefined') return 'fr'
    return localStorage.getItem('rim-admin-locale') || 'fr'
  })

  const dictionary = dictionaries[locale] || dictionaries.fr

  const value = useMemo(() => {
    return {
      locale,
      setLocale: nextLocale => {
        const safeLocale = dictionaries[nextLocale] ? nextLocale : 'fr'
        setLocale(safeLocale)

        if (typeof window !== 'undefined') {
          localStorage.setItem('rim-admin-locale', safeLocale)
        }
      },
      t: key => getNestedValue(dictionary, key) || key,
    }
  }, [locale, dictionary])

  return (
    <AdminI18nContext.Provider value={value}>
      {children}
    </AdminI18nContext.Provider>
  )
}

export function useAdminI18n() {
  const context = useContext(AdminI18nContext)

  if (!context) {
    throw new Error('useAdminI18n must be used inside AdminI18nProvider')
  }

  return context
}