import '../src/styles/global.css'
import '../src/styles/layout.css'
import '../src/styles/components.css'
import '../src/styles/pages.css'
import { Providers } from './providers'
import SiteChrome from '../src/components/SiteChrome'
import AgentationDev from '../src/components/AgentationDev'

export const metadata = {
  title: 'Lux Lumina — Premium Decorative Lighting',
  description: 'Curated decorative lighting for modern interiors — where craftsmanship meets contemporary design.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <SiteChrome>
            {children}
          </SiteChrome>
          <AgentationDev />
        </Providers>
      </body>
    </html>
  )
}
