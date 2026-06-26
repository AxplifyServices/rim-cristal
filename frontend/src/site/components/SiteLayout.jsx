import { Suspense } from 'react'
import SiteAgentation from './SiteAgentation'
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
          Kaystia Home
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
      <Suspense
        fallback={<HeaderFallback />}
      >
        <SiteHeader />
      </Suspense>

      <main className="site-main">
        {children}
      </main>

      <SiteFooter />

      <SiteAgentation />
    </div>
  )
}