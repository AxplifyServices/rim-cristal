'use client'
import { Suspense } from 'react'
import ResetPassword from '../../src/views/ResetPassword'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="page-wrap" style={{ padding: '80px 20px' }}>Loading…</div>}>
      <ResetPassword />
    </Suspense>
  )
}
