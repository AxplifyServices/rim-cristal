'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

const CART_STORAGE_KEY = 'kaystia-home-cart'
const LEGACY_CART_STORAGE_KEY = 'lux-lumina-cart'

const CartContext =
  createContext(null)

function createCartItemKey(
  productId,
  productSizeVariantId,
  selectedColor
) {
  return [
    productId,
    productSizeVariantId || '',
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
      const savedCart =
        window.localStorage.getItem(
          CART_STORAGE_KEY
        ) ||
        window.localStorage.getItem(
          LEGACY_CART_STORAGE_KEY
        )

      const saved = JSON.parse(
        savedCart || '[]'
      )

      if (Array.isArray(saved)) {
        const normalized =
          saved.map(item => ({
            ...item,

image:
  item.thumbnailImage ||
  item.image ||
  '/images/product-placeholder.svg',            

productSizeVariantId:
  item.productSizeVariantId
    ? String(
        item.productSizeVariantId
      )
    : null,

selectedSize:
  item.selectedSize ||
  null,

selectedColor:
  item.selectedColor ||
  null,

isBackorder:
  Boolean(
    item.isBackorder
  ),

cartItemKey:
  createCartItemKey(
    item.id,
    item.productSizeVariantId,
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
      CART_STORAGE_KEY,
      JSON.stringify(items)
    )

    window.localStorage.removeItem(
      LEGACY_CART_STORAGE_KEY
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
const productSizeVariantId =
  product.productSizeVariantId
    ? String(
        product.productSizeVariantId
      )
    : null

const selectedSize =
  product.selectedSize ||
  null

const selectedColor =
  product.selectedColor ||
  null

const cartItemKey =
  createCartItemKey(
    product.id,
    productSizeVariantId,
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
  product.thumbnailImage ||
  product.imageVariants?.[0]
    ?.thumbnail ||
  product.cardImage ||
  product.image ||
  '/images/product-placeholder.svg',

detailImage:
  product.detailImage ||
  product.imageVariants?.[0]
    ?.detail ||
  product.image ||
  null,

largeImage:
  product.largeImage ||
  product.imageVariants?.[0]
    ?.large ||
  product.detailImage ||
  product.image ||
  null,  

productSizeVariantId,

selectedSize,

selectedColor,

isBackorder:
  Boolean(
    product.isBackorder
  ),

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