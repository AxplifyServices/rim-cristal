import { Suspense } from 'react'
import SiteFooter from './SiteFooter'
import SiteHeader from './SiteHeader'

function HeaderFallback() {
  return (
    <header className="site-header">
      <div className="container header-row">
        <div
          className="brand"
          aria-hidden="true"
        >
          Rim Cristal
        </div>
      </div>
    </header>
  )
}

export default function SiteLayout({
  children,
}) {
  return (
    <div className="site-shell">
      <Suspense fallback={<HeaderFallback />}>
        <SiteHeader />
      </Suspense>

      <main className="site-main">
        {children}
      </main>

      <SiteFooter />
    </div>
  )
}