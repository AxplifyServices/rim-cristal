'use client'
import { Suspense } from 'react'
import Login from '../../src/views/Login'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="page-wrap" style={{ padding: '80px 20px' }}>Loading…</div>}>
      <Login />
    </Suspense>
  )
}
