'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  loginRequest,
  registerRequest,
  clearTokens,
  getStoredUser,
  setStoredUser,
} from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = getStoredUser()

    if (storedUser) {
      setUser(storedUser)
    }

    setLoading(false)
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await loginRequest(email, password)
    const loggedUser = data.user

    setUser(loggedUser)
    setStoredUser(loggedUser)

    return loggedUser
  }, [])

  const register = useCallback(async data => {
    const res = await registerRequest(data)
    const registeredUser = res.user

    setUser(registeredUser)
    setStoredUser(registeredUser)

    return registeredUser
  }, [])

  const logout = useCallback(() => {
    clearTokens()
    setUser(null)
  }, [])

  const updateUser = useCallback(updatedUser => {
    setUser(updatedUser)
    setStoredUser(updatedUser)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isAdmin: user?.is_admin || false,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)

  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return ctx
}