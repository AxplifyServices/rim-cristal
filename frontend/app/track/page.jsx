'use client'
import { Suspense } from 'react'
import TrackOrder from '../../src/views/TrackOrder'

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="page-wrap" style={{ padding: '80px 20px', color: 'var(--text-3)' }}>Loading…</div>}>
      <TrackOrder />
    </Suspense>
  )
}
