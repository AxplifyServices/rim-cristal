import { AdminI18nProvider } from '../../src/admin/i18n/AdminI18nProvider'

export const metadata = {
  title: {
    default: 'Administration | Casa Luxury Decor',
    template: '%s | Administration Casa Luxury Decor',
  },

  description:
    'Gestion des produits, des commandes, des stocks et des points de vente Casa Luxury Decor.',

  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nocache: true,
  },

  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
}

export default function AdminLayout({ children }) {
  return (
    <AdminI18nProvider>
      {children}
    </AdminI18nProvider>
  )
}