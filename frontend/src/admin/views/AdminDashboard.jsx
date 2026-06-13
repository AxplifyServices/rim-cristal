'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminShell from '../components/AdminShell'
import { adminApi } from '../lib/adminApi'
import { getAdminUser } from '../lib/adminAuth'
import { useAdminI18n } from '../i18n/AdminI18nProvider'

export default function AdminDashboard() {
  const { t } = useAdminI18n()

  const [stats, setStats] = useState(null)
  const [user, setUser] = useState(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    point_of_sale_id: '',
    category: '',
  })
  const [filterOptions, setFilterOptions] = useState({
    points_of_sale: [],
    categories: [],
  })

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    const currentUser = getAdminUser()
    setUser(currentUser)

    adminApi.get('/admin/dashboard-filters')
      .then(setFilterOptions)
      .catch(() => {
        setFilterOptions({
          points_of_sale: [],
          categories: [],
        })
      })
  }, [])

  const statsPath = useMemo(() => {
    const params = new URLSearchParams()

    if (filters.start_date) params.set('start_date', filters.start_date)
    if (filters.end_date) params.set('end_date', filters.end_date)
    if (filters.category) params.set('category', filters.category)

    if (isAdmin && filters.point_of_sale_id) {
      params.set('point_of_sale_id', filters.point_of_sale_id)
    }

    const query = params.toString()

    return query ? `/admin/stats?${query}` : '/admin/stats'
  }, [filters, isAdmin])

  useEffect(() => {
    if (!user) return

    adminApi.get(statsPath)
      .then(setStats)
      .catch(() => setStats(null))
  }, [user, statsPath])

  function updateFilter(name, value) {
    setFilters(current => ({
      ...current,
      [name]: value,
    }))
  }

  function resetFilters() {
    setFilters({
      start_date: '',
      end_date: '',
      point_of_sale_id: '',
      category: '',
    })
  }

  function openDatePicker(event) {
    const input = event.currentTarget

    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker()
      }
    } catch {
      // Certains navigateurs bloquent showPicker si l'action n'est pas considérée
      // comme un geste utilisateur direct. Dans ce cas, le date picker natif reste disponible.
    }
  }

  return (
    <AdminShell>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{t('dashboard.title')}</h1>
          <p style={styles.subtitle}>
            {isAdmin ? t('dashboard.adminSubtitle') : t('dashboard.posSubtitle')}
          </p>
        </div>
      </div>

      <section style={styles.filters}>
        <div style={styles.filterHeader}>
          <button
            type="button"
            onClick={() => setFiltersOpen(current => !current)}
            style={styles.filterToggle}
            aria-expanded={filtersOpen}
          >
            <span style={styles.funnelIcon}>
              <span style={styles.funnelTop} />
              <span style={styles.funnelStem} />
            </span>
            <span>{t('dashboard.filters')}</span>
          </button>

          {filtersOpen && (
            <button type="button" onClick={resetFilters} style={styles.resetButton}>
              {t('dashboard.resetFilters')}
            </button>
          )}
        </div>

        {filtersOpen && (
          <div style={styles.filterGrid}>
            <label style={styles.field}>
              <span style={styles.label}>{t('dashboard.startDate')}</span>
              <input
                type="date"
                value={filters.start_date}
                onClick={openDatePicker}
                onKeyDown={event => event.preventDefault()}
                onChange={e => updateFilter('start_date', e.target.value)}
                style={styles.input}
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>{t('dashboard.endDate')}</span>
              <input
                type="date"
                value={filters.end_date}
                onClick={openDatePicker}
                onKeyDown={event => event.preventDefault()}
                onChange={e => updateFilter('end_date', e.target.value)}
                style={styles.input}
              />
            </label>

            {isAdmin && (
              <label style={styles.field}>
                <span style={styles.label}>{t('dashboard.pointOfSale')}</span>
                <select
                  value={filters.point_of_sale_id}
                  onChange={e => updateFilter('point_of_sale_id', e.target.value)}
                  style={styles.input}
                >
                  <option value="">{t('dashboard.allPointsOfSale')}</option>
                  {filterOptions.points_of_sale.map(pointOfSale => (
                    <option key={pointOfSale.id} value={pointOfSale.id}>
                      {pointOfSale.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label style={styles.field}>
              <span style={styles.label}>{t('dashboard.category')}</span>
              <select
                value={filters.category}
                onChange={e => updateFilter('category', e.target.value)}
                style={styles.input}
              >
                <option value="">{t('dashboard.allCategories')}</option>
                {filterOptions.categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </section>

      {isAdmin ? (
        <AdminStats stats={stats} t={t} />
      ) : (
        <PointOfSaleStats stats={stats} t={t} />
      )}
    </AdminShell>
  )
}

function AdminStats({ stats, t }) {
  return (
    <div style={styles.grid}>
      <Card label={t('dashboard.globalStock')} value={stats?.global_stock_units || 0} />
      <Card label={t('dashboard.pointsOfSale')} value={stats?.points_of_sale || 0} />
      <Card label={t('dashboard.webOrders')} value={stats?.orders || 0} />
      <Card label={t('dashboard.webRevenue')} value={`${Number(stats?.revenue || 0).toFixed(2)} DH`} />
    </div>
  )
}

function PointOfSaleStats({ stats, t }) {
  return (
    <div style={styles.grid}>
      <Card label={t('dashboard.posStock')} value={stats?.point_of_sale_stock_units || 0} />
      <Card label={t('dashboard.posSales')} value={stats?.sales || 0} />
      <Card label={t('dashboard.posRevenue')} value={`${Number(stats?.revenue || 0).toFixed(2)} DH`} />
    </div>
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 14,
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    margin: 0,
    letterSpacing: '-0.04em',
  },
  subtitle: {
    color: '#8a7f72',
    marginTop: 6,
    marginBottom: 0,
    fontSize: 14,
  },
  filters: {
    background: '#fff',
    border: '1px solid #e6ded2',
    borderRadius: 24,
    padding: 14,
    marginBottom: 14,
  },
  filterHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  filterToggle: {
    border: '1px solid #e6ded2',
    borderRadius: 999,
    background: '#f7f3ed',
    color: '#1f1a14',
    padding: '9px 13px',
    fontSize: 13,
    fontWeight: 900,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  },
  funnelIcon: {
    width: 24,
    height: 24,
    borderRadius: 999,
    background: '#1f1a14',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 1,
  },
  funnelTop: {
    width: 10,
    height: 7,
    background: '#fff',
    clipPath: 'polygon(0 0, 100% 0, 64% 100%, 36% 100%)',
    display: 'block',
  },
  funnelStem: {
    width: 3,
    height: 5,
    borderRadius: 99,
    background: '#fff',
    display: 'block',
  },
  resetButton: {
    border: '1px solid #e6ded2',
    borderRadius: 999,
    background: '#f7f3ed',
    color: '#1f1a14',
    padding: '8px 12px',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 10,
    marginTop: 12,
  },
  field: {
    display: 'grid',
    gap: 6,
  },
  label: {
    fontSize: 12,
    color: '#8a7f72',
    fontWeight: 800,
  },
  input: {
    width: '100%',
    minHeight: 44,
    border: '1px solid #e6ded2',
    borderRadius: 14,
    background: '#fff',
    color: '#1f1a14',
    padding: '0 12px',
    fontSize: 14,
    outline: 'none',
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
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
    fontWeight: 800,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: 900,
  },
}