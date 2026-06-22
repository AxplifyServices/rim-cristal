import { Suspense } from 'react'
import CheckoutSuccessPage from '../../../src/site/pages/CheckoutSuccessPage'

export const metadata = {
  title: 'Commande enregistrée',
}

function LoadingCheckoutSuccess() {
  return (
    <main
      style={{
        minHeight: '60vh',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      Chargement…
    </main>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingCheckoutSuccess />}>
      <CheckoutSuccessPage />
    </Suspense>
  )
}