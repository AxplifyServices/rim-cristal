'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

const CartContext =
  createContext(null)

function createCartItemKey(
  productId,
  selectedColor
) {
  return [
    productId,
    selectedColor || '',
  ].join(':')
}

export function CartProvider({
  children,
}) {
  const [items, setItems] =
    useState([])

  useEffect(() => {
    try {
      const saved = JSON.parse(
        window.localStorage.getItem(
          'lux-lumina-cart'
        ) || '[]'
      )

      if (Array.isArray(saved)) {
        const normalized =
          saved.map(item => ({
            ...item,

            selectedColor:
              item.selectedColor ||
              null,

            cartItemKey:
              item.cartItemKey ||
              createCartItemKey(
                item.id,
                item.selectedColor
              ),
          }))

        setItems(normalized)
      }
    } catch {
      setItems([])
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(
      'lux-lumina-cart',
      JSON.stringify(items)
    )
  }, [items])

  const value = useMemo(() => {
    return {
      items,

      count: items.reduce(
        (sum, item) =>
          sum + item.quantity,
        0
      ),

      subtotal: items.reduce(
        (sum, item) =>
          sum +
          item.price *
            item.quantity,
        0
      ),

      add(
        product,
        quantity = 1
      ) {
        setItems(current => {
          const selectedColor =
            product.selectedColor ||
            null

          const cartItemKey =
            createCartItemKey(
              product.id,
              selectedColor
            )

          const existing =
            current.find(
              item =>
                item.cartItemKey ===
                cartItemKey
            )

          if (existing) {
            return current.map(
              item =>
                item.cartItemKey ===
                cartItemKey
                  ? {
                      ...item,
                      quantity:
                        item.quantity +
                        quantity,
                    }
                  : item
            )
          }

          return [
            ...current,
            {
              cartItemKey,

              id:
                product.id,

              slug:
                product.slug,

              name:
                product.name,

              reference:
                product.reference,

              price:
                product.price,

              image:
                product.image,

              selectedColor,

              quantity,
            },
          ]
        })
      },

      update(
        cartItemKey,
        quantity
      ) {
        setItems(current =>
          current.map(item =>
            item.cartItemKey ===
            cartItemKey
              ? {
                  ...item,

                  quantity:
                    Math.max(
                      1,
                      Number(
                        quantity
                      ) || 1
                    ),
                }
              : item
          )
        )
      },

      remove(cartItemKey) {
        setItems(current =>
          current.filter(
            item =>
              item.cartItemKey !==
              cartItemKey
          )
        )
      },

      clear() {
        setItems([])
      },
    }
  }, [items])

  return (
    <CartContext.Provider
      value={value}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context =
    useContext(CartContext)

  if (!context) {
    throw new Error(
      'useCart doit être utilisé dans CartProvider'
    )
  }

  return context
}