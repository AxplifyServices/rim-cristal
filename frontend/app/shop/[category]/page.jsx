'use client'
import { Suspense } from 'react'
import Shop from '../../../src/views/Shop'

export default function ShopCategoryPage() {
  return (
    <Suspense fallback={<div className="page-wrap" style={{ padding: '80px 20px', textAlign: 'center' }}>Loading…</div>}>
      <Shop />
    </Suspense>
  )
}
