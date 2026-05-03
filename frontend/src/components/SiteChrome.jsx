'use client'
import { usePathname } from 'next/navigation'
import AnnouncementBar from './AnnouncementBar'
import Header from './Header'
import Footer from './Footer'
import CartDrawer from './CartDrawer'
import WhatsAppFAB from './WhatsAppFAB'
import Toast from './Toast'

export default function SiteChrome({ children }) {
  const pathname = usePathname()
  const isAdmin  = pathname?.startsWith('/admin')

  if (isAdmin) {
    // Admin pages have their own full-screen layout (AdminShell)
    return <>{children}</>
  }

  return (
    <>
      <AnnouncementBar />
      <Header />
      <main>{children}</main>
      <Footer />
      <CartDrawer />
      <WhatsAppFAB />
      <Toast />
    </>
  )
}
