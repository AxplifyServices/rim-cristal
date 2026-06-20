import '../src/styles/site.css'
import { SiteProviders } from './providers'

export const metadata = {
  title: {
    default: 'Lux Lumina — Maison & décoration',
    template: '%s | Lux Lumina',
  },
  description:
    'Découvrez les collections Lux Lumina : luminaires, décoration et accessoires pour la maison.',
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