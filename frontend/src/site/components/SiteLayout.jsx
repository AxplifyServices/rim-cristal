import { Suspense } from 'react'
import SiteAgentation from './SiteAgentation'
import SiteFooter from './SiteFooter'
import SiteHeader from './SiteHeader'

function HeaderFallback() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div
          className="site-brand"
          aria-hidden="true"
        >
          <span className="site-brand-mark">
            H
          </span>

          <span className="site-brand-copy">
            <strong>
              CasaLuxuryDecor
            </strong>

            <small>
              Maison d’artiste
            </small>
          </span>
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