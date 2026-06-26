import { AdminI18nProvider } from '../../src/admin/i18n/AdminI18nProvider'

export const metadata = {
  title: 'Kaystia Home Admin',
  description:
    'Gestion des commandes, des stocks et des points de vente Kaystia Home',
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