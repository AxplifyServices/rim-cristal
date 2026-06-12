'use client'

const TOKEN_KEY = 'rim-admin-token'
const USER_KEY = 'rim-admin-user'

export function getAdminToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getAdminUser() {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setAdminSession(data) {
  if (typeof window === 'undefined') return

  if (data?.access_token) {
    localStorage.setItem(TOKEN_KEY, data.access_token)
  }

  if (data?.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
  }
}

export function clearAdminSession() {
  if (typeof window === 'undefined') return

  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function requireAdminSession(router) {
  const token = getAdminToken()

  if (!token) {
    router.replace('/admin/login')
    return null
  }

  return token
}