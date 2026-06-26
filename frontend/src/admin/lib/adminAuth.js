'use client'

const TOKEN_KEY =
  'kaystia-admin-token'

const USER_KEY =
  'kaystia-admin-user'

const LEGACY_TOKEN_KEY =
  'rim-admin-token'

const LEGACY_USER_KEY =
  'rim-admin-user'

export function getAdminToken() {
  if (
    typeof window === 'undefined'
  ) {
    return null
  }

  const currentToken =
    window.localStorage.getItem(
      TOKEN_KEY
    )

  const legacyToken =
    window.localStorage.getItem(
      LEGACY_TOKEN_KEY
    )

  const token =
    currentToken ||
    legacyToken

  if (
    token &&
    !currentToken
  ) {
    window.localStorage.setItem(
      TOKEN_KEY,
      token
    )
  }

  window.localStorage.removeItem(
    LEGACY_TOKEN_KEY
  )

  return token
}

export function getAdminUser() {
  if (
    typeof window === 'undefined'
  ) {
    return null
  }

  try {
    const currentUser =
      window.localStorage.getItem(
        USER_KEY
      )

    const legacyUser =
      window.localStorage.getItem(
        LEGACY_USER_KEY
      )

    const raw =
      currentUser ||
      legacyUser

    if (
      raw &&
      !currentUser
    ) {
      window.localStorage.setItem(
        USER_KEY,
        raw
      )
    }

    window.localStorage.removeItem(
      LEGACY_USER_KEY
    )

    return raw
      ? JSON.parse(raw)
      : null
  } catch {
    return null
  }
}

export function setAdminSession(
  data
) {
  if (
    typeof window === 'undefined'
  ) {
    return
  }

  if (data?.access_token) {
    window.localStorage.setItem(
      TOKEN_KEY,
      data.access_token
    )
  }

  if (data?.user) {
    window.localStorage.setItem(
      USER_KEY,
      JSON.stringify(
        data.user
      )
    )
  }

  window.localStorage.removeItem(
    LEGACY_TOKEN_KEY
  )

  window.localStorage.removeItem(
    LEGACY_USER_KEY
  )
}

export function clearAdminSession() {
  if (
    typeof window === 'undefined'
  ) {
    return
  }

  window.localStorage.removeItem(
    TOKEN_KEY
  )

  window.localStorage.removeItem(
    USER_KEY
  )

  window.localStorage.removeItem(
    LEGACY_TOKEN_KEY
  )

  window.localStorage.removeItem(
    LEGACY_USER_KEY
  )
}

export function requireAdminSession(
  router
) {
  const token =
    getAdminToken()

  if (!token) {
    router.replace(
      '/admin/login'
    )

    return null
  }

  return token
}