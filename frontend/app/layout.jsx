import '../src/styles/site.css'
import { SiteProviders } from './providers'

export const metadata = {
  title: {
    default: 'Kaystia Home — Maison & décoration',
    template: '%s | Kaystia Home',
  },
  description:
    'Découvrez les collections Kaystia Home : mobilier, luminaires, décoration et accessoires pour la maison.',
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <SiteProviders>{children}</SiteProviders>
      </body>
    </html>
  )
}