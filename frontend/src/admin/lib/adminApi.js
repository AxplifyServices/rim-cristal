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

async function request(method, path, body) {
  const token = getAdminToken()

  const headers = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const data = await parseResponse(res)

  if (res.status === 401) {
    clearAdminSession()

    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login'
    }

    throw new Error('Unauthorized')
  }

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

export const adminApi = {
  get: path => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  del: path => request('DELETE', path),
}