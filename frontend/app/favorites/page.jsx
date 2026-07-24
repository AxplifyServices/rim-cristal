import FavoritesPage from '../../src/site/pages/FavoritesPage'

export const metadata = {
  title: 'Mes favoris',

  description:
    'Retrouvez votre sélection personnelle de mobilier, luminaires et objets décoratifs Casa Luxury Decor.',

  robots: {
    index: false,
    follow: true,
  },
}

export default function Page() {
  return <FavoritesPage />
}