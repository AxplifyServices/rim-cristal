'use client'
import { CartProvider } from '../src/context/CartContext'
import { AuthProvider } from '../src/context/AuthContext'

export function Providers({ children }) {
  return (
    <AuthProvider>
      <CartProvider>{children}</CartProvider>
    </AuthProvider>
  )
}
