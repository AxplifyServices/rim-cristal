'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

const FAVORITES_STORAGE_KEY =
  'casa-luxury-decor-favorites'

const FavoritesContext =
  createContext(null)

export function FavoritesProvider({
  children,
}) {
  const [
    favoriteProductIds,
    setFavoriteProductIds,
  ] = useState([])

  useEffect(() => {
    try {
      const saved =
        window.localStorage.getItem(
          FAVORITES_STORAGE_KEY
        )

      const parsed =
        JSON.parse(
          saved || '[]'
        )

      if (Array.isArray(parsed)) {
        setFavoriteProductIds(
          parsed
            .map(Number)
            .filter(
              productId =>
                Number.isInteger(
                  productId
                ) &&
                productId > 0
            )
        )
      }
    } catch {
      setFavoriteProductIds([])
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify(
        favoriteProductIds
      )
    )
  }, [favoriteProductIds])

  const value = useMemo(() => {
    return {
      favoriteProductIds,

      count:
        favoriteProductIds.length,

      isFavorite(productId) {
        return favoriteProductIds.includes(
          Number(productId)
        )
      },

      toggleFavorite(productId) {
        const normalizedProductId =
          Number(productId)

        if (
          !Number.isInteger(
            normalizedProductId
          ) ||
          normalizedProductId <= 0
        ) {
          return
        }

        setFavoriteProductIds(
          current =>
            current.includes(
              normalizedProductId
            )
              ? current.filter(
                  currentId =>
                    currentId !==
                    normalizedProductId
                )
              : [
                  ...current,
                  normalizedProductId,
                ]
        )
      },

      clearFavorites() {
        setFavoriteProductIds([])
      },
    }
  }, [favoriteProductIds])

  return (
    <FavoritesContext.Provider
      value={value}
    >
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const context =
    useContext(
      FavoritesContext
    )

  if (!context) {
    throw new Error(
      'useFavorites doit être utilisé dans FavoritesProvider'
    )
  }

  return context
}