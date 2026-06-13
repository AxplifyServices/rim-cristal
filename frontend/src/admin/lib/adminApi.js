'use client'

import { clearAdminSession, getAdminToken } from './adminAuth'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

async function parseResponse(res) {
  if (res.status === 204) return null

  const contentType = res.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return res.json()
  }

  return res.text()
}

function extractErrorMessage(data, fallback) {
  if (!data) return fallback

  const message =
    data?.message ||
    data?.detail ||
    data?.error ||
    fallback

  return Array.isArray(message) ? message.join(', ') : message
}

async function request(method, path, body) {
  const token = getAdminToken()

  const headers = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let res
  let data

  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    data = await parseResponse(res)
  } catch (err) {
    throw new Error(
      `Impossible de contacter le serveur API. Vérifie que le backend tourne bien sur ${BASE}.`
    )
  }

  if (res.status === 401) {
    clearAdminSession()

    const message = extractErrorMessage(
      data,
      path === '/auth/login'
        ? 'Email ou mot de passe incorrect.'
        : 'Session expirée. Merci de te reconnecter.'
    )

    // Important :
    // On ne redirige PAS si on est déjà sur la route de login.
    // Sinon l’erreur disparaît car la page se recharge.
    if (path !== '/auth/login' && typeof window !== 'undefined') {
      window.location.href = '/admin/login'
    }

    throw new Error(message)
  }

  if (!res.ok) {
    const message = extractErrorMessage(data, `Request failed (${res.status})`)
    throw new Error(message)
  }

  return data
}

export const adminApi = {
  get: path => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  del: path => request('DELETE', path),
}