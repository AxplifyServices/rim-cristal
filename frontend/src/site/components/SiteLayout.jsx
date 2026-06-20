import SiteFooter from './SiteFooter'
import SiteHeader from './SiteHeader'

export default function SiteLayout({
  children,
}) {
  return (
    <div className="site-shell">
      <SiteHeader />

      <main className="site-main">
        {children}
      </main>

      <SiteFooter />
    </div>
  )
}