import { Suspense } from 'react'
import SiteAgentation from './SiteAgentation'
import SiteFooter from './SiteFooter'
import SiteHeader from './SiteHeader'
import Image from 'next/image'
import Link from 'next/link'

function HeaderFallback() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link
          href="/"
          className="site-brand"
        >
          <Image
            src="/icon.png"
            alt="Logo CasaLuxuryDecor"
            width={92}
            height={81}
            priority
            className="site-brand-logo"
          />

          <strong className="site-brand-name">
            CasaLuxuryDecor
          </strong>
        </Link>
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