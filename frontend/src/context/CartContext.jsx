'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react'

const CartContext = createContext(null)

const EMPTY_CART = { items: [] }

function cartReducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return action.payload || EMPTY_CART

    case 'ADD': {
      const existing = state.items.find(
        i =>
          i.id === action.product.id &&
          i.selectedColor === action.selectedColor &&
          i.selectedSize === action.selectedSize,
      )

      if (existing) {
        return {
          ...state,
          items: state.items.map(i =>
            i === existing ? { ...i, qty: i.qty + action.qty } : i,
          ),
        }
      }

      return {
        ...state,
        items: [
          ...state.items,
          {
            ...action.product,
            qty: action.qty,
            selectedColor: action.selectedColor,
            selectedSize: action.selectedSize,
            lineKey: `${action.product.id}-${action.selectedColor || ''}-${action.selectedSize || ''}`,
          },
        ],
      }
    }

    case 'REMOVE':
      return {
        ...state,
        items: state.items.filter(i => i.lineKey !== action.lineKey),
      }

    case 'SET_QTY':
      return {
        ...state,
        items: state.items
          .map(i =>
            i.lineKey === action.lineKey ? { ...i, qty: action.qty } : i,
          )
          .filter(i => i.qty > 0),
      }

    case 'CLEAR':
      return EMPTY_CART

    default:
      return state
  }
}

function safeReadJson(key, fallback) {
  if (typeof window === 'undefined') return fallback

  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function safeWriteJson(key, value) {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore localStorage errors
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, EMPTY_CART)
  const [hydrated, setHydrated] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [wishlist, setWishlist] = useState([])
  const toastTimerRef = useRef(null)

  useEffect(() => {
    const storedCart = safeReadJson('lux-cart', EMPTY_CART)
    const storedWishlist = safeReadJson('lux-wishlist', [])

    dispatch({
      type: 'HYDRATE',
      payload:
        storedCart && Array.isArray(storedCart.items)
          ? storedCart
          : EMPTY_CART,
    })

    setWishlist(Array.isArray(storedWishlist) ? storedWishlist : [])
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    safeWriteJson('lux-cart', state)
  }, [hydrated, state])

  useEffect(() => {
    if (!hydrated) return
    safeWriteJson('lux-wishlist', wishlist)
  }, [hydrated, wishlist])

  const totalQty = state.items.reduce((s, i) => s + Number(i.qty || 0), 0)
  const subtotal = state.items.reduce(
    (s, i) => s + Number(i.salePrice || 0) * Number(i.qty || 0),
    0,
  )

  const FREE_SHIP = 150
  const shippingDiff = Math.max(0, FREE_SHIP - subtotal)
  const shipPct = Math.min(100, (subtotal / FREE_SHIP) * 100)
  const isFreeShip = subtotal >= FREE_SHIP

  const showToast = useCallback(msg => {
    setToast(msg)

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
    }

    toastTimerRef.current = setTimeout(() => {
      setToast(null)
    }, 3000)
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current)
      }
    }
  }, [])

  const addToCart = useCallback(
    (product, qty = 1, selectedColor, selectedSize) => {
      dispatch({
        type: 'ADD',
        product,
        qty,
        selectedColor,
        selectedSize,
      })

      showToast(`"${product.name}" added to bag`)
    },
    [showToast],
  )

  const removeFromCart = useCallback(lineKey => {
    dispatch({
      type: 'REMOVE',
      lineKey,
    })
  }, [])

  const setQty = useCallback((lineKey, qty) => {
    dispatch({
      type: 'SET_QTY',
      lineKey,
      qty,
    })
  }, [])

  const clearCart = useCallback(() => {
    dispatch({
      type: 'CLEAR',
    })
  }, [])

  const toggleWishlist = useCallback(
    productId => {
      setWishlist(prev => {
        const isIn = prev.includes(productId)

        if (isIn) {
          showToast('Removed from wishlist')
          return prev.filter(id => id !== productId)
        }

        showToast('Saved to wishlist ♡')
        return [...prev, productId]
      })
    },
    [showToast],
  )

  const isWishlisted = useCallback(
    productId => wishlist.includes(productId),
    [wishlist],
  )

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        totalQty,
        subtotal,
        shippingDiff,
        shipPct,
        isFreeShip,
        hydrated,
        drawerOpen,
        openDrawer: () => setDrawerOpen(true),
        closeDrawer: () => setDrawerOpen(false),
        addToCart,
        removeFromCart,
        setQty,
        clearCart,
        toast,
        showToast,
        toggleWishlist,
        isWishlisted,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)

  if (!ctx) {
    throw new Error('useCart must be used within CartProvider')
  }

  return ctx
}