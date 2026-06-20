'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState([])

  useEffect(() => {
    try {
      const saved = JSON.parse(
        window.localStorage.getItem(
          'lux-lumina-cart'
        ) || '[]'
      )

      if (Array.isArray(saved)) {
        setItems(saved)
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
        (sum, item) => sum + item.quantity,
        0
      ),

      subtotal: items.reduce(
        (sum, item) =>
          sum + item.price * item.quantity,
        0
      ),

      add(product, quantity = 1) {
        setItems(current => {
          const existing = current.find(
            item => item.id === product.id
          )

          if (existing) {
            return current.map(item =>
              item.id === product.id
                ? {
                    ...item,
                    quantity:
                      item.quantity + quantity,
                  }
                : item
            )
          }

          return [
            ...current,
            {
              id: product.id,
              slug: product.slug,
              name: product.name,
              reference: product.reference,
              price: product.price,
              image: product.image,
              quantity,
            },
          ]
        })
      },

      update(id, quantity) {
        setItems(current =>
          current.map(item =>
            item.id === id
              ? {
                  ...item,
                  quantity: Math.max(
                    1,
                    quantity
                  ),
                }
              : item
          )
        )
      },

      remove(id) {
        setItems(current =>
          current.filter(
            item => item.id !== id
          )
        )
      },

      clear() {
        setItems([])
      },
    }
  }, [items])

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)

  if (!context) {
    throw new Error(
      'useCart doit être utilisé dans CartProvider'
    )
  }

  return context
}