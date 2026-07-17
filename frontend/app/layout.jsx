import '../src/styles/site.css'
import { SiteProviders } from './providers'

export const metadata = {
  metadataBase: new URL(
    'https://casaluxurydecor.axplitest.com'
  ),

  title: {
    default:
      'Casa Luxury Decor | Mobilier, luminaires et décoration',
    template:
      '%s | Casa Luxury Decor',
  },

  description:
    'Découvrez la sélection Casa Luxury Decor : mobilier, luminaires, décoration, art mural, fleurs et arts de la table.',

  applicationName:
    'Casa Luxury Decor',

  alternates: {
    canonical: '/',
  },

  openGraph: {
    type: 'website',
    locale: 'fr_MA',
    alternateLocale: [
      'en_US',
    ],
    siteName:
      'Casa Luxury Decor',
    url:
      'https://casaluxurydecor.axplitest.com',
    title:
      'Casa Luxury Decor | Mobilier, luminaires et décoration',
    description:
      'Mobilier, luminaires et décoration pour des intérieurs uniques.',
  },

  robots: {
    index: true,
    follow: true,
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