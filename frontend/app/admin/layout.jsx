import { AdminI18nProvider } from '../../src/admin/i18n/AdminI18nProvider'

export const metadata = {
  title: 'Rim Cristal Admin',
  description: 'Gestion stock et points de vente Rim Cristal',
}

export default function AdminLayout({ children }) {
  return (
    <AdminI18nProvider>
      {children}
    </AdminI18nProvider>
  )
}