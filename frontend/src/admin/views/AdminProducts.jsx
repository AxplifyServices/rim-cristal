'use client'

import AdminShell from '../components/AdminShell'
import { useAdminI18n } from '../i18n/AdminI18nProvider'
import { getAdminUser } from '../lib/adminAuth'

export default function AdminProducts() {
  const { t } = useAdminI18n()
  const user = getAdminUser()
  const isAdmin = user?.role === 'admin'

  return (
    <AdminShell>
      <h1 style={styles.title}>{t('products.title')}</h1>
      <p style={styles.subtitle}>
        {isAdmin ? t('products.subtitleAdmin') : t('products.subtitlePos')}
      </p>

      <div style={styles.placeholder}>
        Module produits à brancher sur :
        <br />
        {isAdmin ? '/api/admin/products' : '/api/point-of-sale/products'}
      </div>
    </AdminShell>
  )
}

const styles = {
  title: {
    fontSize: 28,
    margin: 0,
    letterSpacing: '-0.04em',
  },
  subtitle: {
    color: '#8a7f72',
    marginTop: 6,
    marginBottom: 18,
    fontSize: 14,
  },
  placeholder: {
    background: '#fff',
    border: '1px solid #e6ded2',
    borderRadius: 22,
    padding: 18,
    fontSize: 14,
    color: '#8a7f72',
  },
}