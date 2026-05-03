'use client'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

function getStoredUser() {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem('lux-user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setStoredUser(user) {
  if (typeof window === 'undefined') return

  if (user) {
    localStorage.setItem('lux-user', JSON.stringify(user))
  }
}

function clearTokens() {
  if (typeof window === 'undefined') return

  localStorage.removeItem('lux-token')
  localStorage.removeItem('lux-refresh')
  localStorage.removeItem('lux-user')
}

function setTokens() {
  // JWT désactivé pour le moment.
  // On garde la fonction pour ne pas casser les imports existants.
}

function getToken() {
  // JWT désactivé pour le moment.
  return null
}

async function parseResponse(res) {
  if (res.status === 204) return null

  const contentType = res.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return res.json()
  }

  return res.text()
}

async function request(method, path, body) {
  const headers = {
    'Content-Type': 'application/json',
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const data = await parseResponse(res)

  if (!res.ok) {
    const message =
      data?.message ||
      data?.detail ||
      data?.error ||
      `Request failed (${res.status})`

    throw new Error(Array.isArray(message) ? message.join(', ') : message)
  }

  return data
}

export const api = {
  get: path => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  del: path => request('DELETE', path),
}

export async function loginRequest(email, password) {
  const data = await api.post('/auth/login', {
    email,
    password,
  })

  if (data?.user) {
    setStoredUser(data.user)
  }

  return data
}

export async function registerRequest(body) {
  const data = await api.post('/auth/register', body)

  if (data?.user) {
    setStoredUser(data.user)
  }

  return data
}

export {
  clearTokens,
  setTokens,
  getToken,
  getStoredUser,
  setStoredUser,
}