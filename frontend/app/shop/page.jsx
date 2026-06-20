import { Suspense } from 'react'
import ShopPage from '../../src/site/pages/ShopPage'

export const metadata = {
  title: 'Boutique',
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 32 }}>Chargement…</div>}>
      <ShopPage />
    </Suspense>
  )
}