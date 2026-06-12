'use client'

import { useEffect, useState } from 'react'
import AdminShell from '../components/AdminShell'
import { adminApi } from '../lib/adminApi'
import { getAdminUser } from '../lib/adminAuth'
import { useAdminI18n } from '../i18n/AdminI18nProvider'

export default function AdminDashboard() {
  const { t } = useAdminI18n()
  const [stats, setStats] = useState(null)
  const [user, setUser] = useState(null)

  useEffect(() => {
    setUser(getAdminUser())

    adminApi.get('/admin/stats')
      .then(setStats)
      .catch(() => setStats(null))
  }, [])

  const isAdmin = user?.role === 'admin'

  return (
    <AdminShell>
      <h1 style={styles.title}>{t('dashboard.title')}</h1>
      <p style={styles.subtitle}>
        {isAdmin ? t('dashboard.adminSubtitle') : t('dashboard.posSubtitle')}
      </p>

      <div style={styles.grid}>
        {isAdmin && (
          <Card label={t('dashboard.globalStock')} value={stats?.global_stock_units || 0} />
        )}

        <Card label={t('dashboard.posStock')} value={stats?.point_of_sale_stock_units || 0} />
        <Card label={t('dashboard.sales')} value={stats?.sales || 0} />

        {isAdmin && (
          <>
            <Card label={t('dashboard.orders')} value={stats?.orders || 0} />
            <Card label={t('dashboard.revenue')} value={`${Number(stats?.revenue || 0).toFixed(2)} DH`} />
          </>
        )}
      </div>
    </AdminShell>
  )
}

function Card({ label, value }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardLabel}>{label}</div>
      <div style={styles.cardValue}>{value}</div>
    </div>
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 12,
  },
  card: {
    background: '#fff',
    border: '1px solid #e6ded2',
    borderRadius: 22,
    padding: 18,
  },
  cardLabel: {
    fontSize: 12,
    color: '#8a7f72',
    marginBottom: 10,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: 900,
  },
}