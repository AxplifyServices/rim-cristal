'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminShell from '../components/AdminShell'
import { adminApi } from '../lib/adminApi'
import { getAdminUser } from '../lib/adminAuth'
import { useAdminI18n } from '../i18n/AdminI18nProvider'

export default function AdminDashboard() {
  const { t } = useAdminI18n()

  const [stats, setStats] = useState(null)
  const [stockDashboard, setStockDashboard] = useState(null)
  const [user, setUser] = useState(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [topProductsMode, setTopProductsMode] = useState('revenue')
  const [topPointsOfSaleMode, setTopPointsOfSaleMode] = useState('revenue')

  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    point_of_sale_id: '',
    category: '',
  })

  const [stockFilters, setStockFilters] = useState({
    location_type: 'global',
    point_of_sale_id: '',
    product_id: '',
  })

  const [filterOptions, setFilterOptions] = useState({
    points_of_sale: [],
    categories: [],
    products: [],
  })

  const isAdmin = user?.role === 'admin'

useEffect(() => {
  const currentUser = getAdminUser()
  setUser(currentUser)

  if (currentUser?.role === 'point_of_sale') {
    setStockFilters(current => ({
      ...current,
      location_type: 'pos',
      point_of_sale_id: String(currentUser.point_of_sale_id || ''),
    }))
  }

  adminApi.get('/admin/dashboard-filters')
      .then(data => {
        setFilterOptions({
          points_of_sale: Array.isArray(data?.points_of_sale) ? data.points_of_sale : [],
          categories: Array.isArray(data?.categories) ? data.categories : [],
          products: Array.isArray(data?.products) ? data.products : [],
        })
      })
      .catch(() => {
        setFilterOptions({
          points_of_sale: [],
          categories: [],
          products: [],
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

  const stockDashboardPath = useMemo(() => {
    const params = new URLSearchParams()

    if (filters.start_date) params.set('start_date', filters.start_date)
    if (filters.end_date) params.set('end_date', filters.end_date)
    if (stockFilters.location_type) {
      params.set('location_type', stockFilters.location_type)
    }
 params.set('location_type', isAdmin ? stockFilters.location_type : 'pos')

if (isAdmin && stockFilters.location_type === 'pos' && stockFilters.point_of_sale_id) {
  params.set('point_of_sale_id', stockFilters.point_of_sale_id)
}

    const query = params.toString()

    return query ? `/admin/dashboard-stock?${query}` : '/admin/dashboard-stock'
  }, [filters.start_date, filters.end_date, stockFilters, isAdmin])

  useEffect(() => {
    if (!user) return

    adminApi.get(statsPath)
      .then(setStats)
      .catch(() => setStats(null))
  }, [user, statsPath])

  useEffect(() => {
    if (!user || !stockFilters.product_id) {
      setStockDashboard(null)
      return
    }

    adminApi.get(stockDashboardPath)
      .then(setStockDashboard)
      .catch(() => setStockDashboard(null))
  }, [user, stockDashboardPath, stockFilters.product_id])

  function updateFilter(name, value) {
    setFilters(current => ({
      ...current,
      [name]: value,
    }))
  }

  function updateStockFilter(name, value) {
    setStockFilters(current => ({
      ...current,
      [name]: value,
      ...(name === 'location_type' && value === 'global'
        ? { point_of_sale_id: '' }
        : {}),
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
      // fallback navigateur
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

            {!isAdmin && (
            <div style={styles.infoBox}>
              Stock de votre point de vente
            </div>
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

      <DashboardStats stats={stats} isAdmin={isAdmin} />

      <section style={styles.twoColumns}>
        <TopListCard
          title="Top 5 produits vendus"
          mode={topProductsMode}
          onModeChange={setTopProductsMode}
          firstModeLabel="Par CA"
          secondModeLabel="Par quantité"
          firstModeValue="revenue"
          secondModeValue="quantity"
          items={
            topProductsMode === 'revenue'
              ? stats?.top_products_by_revenue || []
              : stats?.top_products_by_quantity || []
          }
          renderItem={item => (
            <>
              <strong>{item.product_name}</strong>
              <span style={styles.muted}>{item.product_reference || '-'}</span>
              <span>
                {Number(item.revenue || 0).toFixed(2)} DH · {Number(item.quantity || 0)} vendu(s)
              </span>
            </>
          )}
        />

        {isAdmin && (
          <TopListCard
            title="Top 5 points de vente"
            mode={topPointsOfSaleMode}
            onModeChange={setTopPointsOfSaleMode}
            firstModeLabel="Par CA"
            secondModeLabel="Par ventes"
            firstModeValue="revenue"
            secondModeValue="sales"
            items={
              topPointsOfSaleMode === 'revenue'
                ? stats?.top_points_of_sale_by_revenue || []
                : stats?.top_points_of_sale_by_sales || []
            }
            renderItem={item => (
              <>
                <strong>{item.point_of_sale_name}</strong>
                <span>
                  {Number(item.revenue || 0).toFixed(2)} DH · {Number(item.sales || 0)} vente(s)
                </span>
              </>
            )}
          />
        )}
      </section>

      <section style={styles.stockDashboard}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Suivi de stock, ventes et CA</h2>
            <p style={styles.sectionSubtitle}>
              Sélectionne un produit et un emplacement pour suivre l’évolution.
            </p>
          </div>
        </div>

        <div style={styles.filterGrid}>
          {isAdmin && (
            <label style={styles.field}>
              <span style={styles.label}>Emplacement</span>
              <select
                value={stockFilters.location_type}
                onChange={e => updateStockFilter('location_type', e.target.value)}
                style={styles.input}
              >
                <option value="global">Stock principal</option>
                <option value="pos">Point de vente</option>
              </select>
            </label>
          )}

          {isAdmin && stockFilters.location_type === 'pos' && (
            <label style={styles.field}>
              <span style={styles.label}>Point de vente</span>
              <select
                value={stockFilters.point_of_sale_id}
                onChange={e => updateStockFilter('point_of_sale_id', e.target.value)}
                style={styles.input}
              >
                <option value="">Choisir un point de vente</option>
                {filterOptions.points_of_sale.map(pointOfSale => (
                  <option key={pointOfSale.id} value={pointOfSale.id}>
                    {pointOfSale.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label style={styles.field}>
            <span style={styles.label}>Produit</span>
            <select
              value={stockFilters.product_id}
              onChange={e => updateStockFilter('product_id', e.target.value)}
              style={styles.input}
            >
              <option value="">Choisir un produit</option>
              {filterOptions.products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} {product.reference ? `- ${product.reference}` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>

        {!stockFilters.product_id ? (
          <div style={styles.empty}>Choisis un produit pour afficher les courbes.</div>
        ) : (
          <div style={styles.chartGrid}>
            <ChartCard
              title="Évolution du stock"
              suffix=" unités"
              data={stockDashboard?.stock_series || []}
            />
            <ChartCard
              title="Ventes"
              suffix=" unités"
              data={stockDashboard?.sales_series || []}
            />
            <ChartCard
              title="Chiffre d'affaires"
              suffix=" DH"
              data={stockDashboard?.revenue_series || []}
            />
          </div>
        )}
      </section>
    </AdminShell>
  )
}

function DashboardStats({ stats, isAdmin }) {
  return (
    <div style={styles.grid}>
      <Card label="CA global" value={`${Number(stats?.revenue || 0).toFixed(2)} DH`} />
      <Card label="Nombre de ventes" value={stats?.sales || 0} />
      {isAdmin && <Card label="Commandes web" value={stats?.orders || 0} />}
      {isAdmin && <Card label="Points de vente" value={stats?.points_of_sale || 0} />}
    </div>
  )
}

function TopListCard({
  title,
  mode,
  onModeChange,
  firstModeLabel,
  secondModeLabel,
  firstModeValue,
  secondModeValue,
  items,
  renderItem,
}) {
  return (
    <section style={styles.panel}>
      <div style={styles.panelHeader}>
        <h2 style={styles.panelTitle}>{title}</h2>

        <div style={styles.segmented}>
          <button
            type="button"
            onClick={() => onModeChange(firstModeValue)}
            style={{
              ...styles.segmentButton,
              ...(mode === firstModeValue ? styles.segmentButtonActive : {}),
            }}
          >
            {firstModeLabel}
          </button>
          <button
            type="button"
            onClick={() => onModeChange(secondModeValue)}
            style={{
              ...styles.segmentButton,
              ...(mode === secondModeValue ? styles.segmentButtonActive : {}),
            }}
          >
            {secondModeLabel}
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div style={styles.empty}>Aucune donnée</div>
      ) : (
        <div style={styles.list}>
          {items.map((item, index) => (
            <div key={`${title}-${index}`} style={styles.listItem}>
              <span style={styles.rank}>{index + 1}</span>
              <div style={styles.listContent}>{renderItem(item)}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function ChartCard({ title, data, suffix }) {
  return (
    <section style={styles.panel}>
      <h2 style={styles.panelTitle}>{title}</h2>
      <MiniLineChart data={data} suffix={suffix} />
    </section>
  )
}

function MiniLineChart({ data, suffix }) {
  const width = 520
  const height = 220
  const padding = 28

  const cleanData = Array.isArray(data)
    ? data.filter(point => point && point.date && !Number.isNaN(Number(point.value)))
    : []

  if (cleanData.length === 0) {
    return <div style={styles.empty}>Aucune donnée</div>
  }

  const values = cleanData.map(point => Number(point.value || 0))
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = Math.max(max - min, 1)

  const points = cleanData.map((point, index) => {
    const x =
      cleanData.length === 1
        ? width / 2
        : padding + (index * (width - padding * 2)) / (cleanData.length - 1)

    const y = height - padding - ((Number(point.value || 0) - min) / range) * (height - padding * 2)

    return {
      x,
      y,
      value: Number(point.value || 0),
      date: point.date,
    }
  })

  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

  const lastPoint = points[points.length - 1]

  return (
    <div style={styles.chartWrap}>
      <svg viewBox={`0 0 ${width} ${height}`} style={styles.chart}>
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e6ded2" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#e6ded2" />
        <path d={path} fill="none" stroke="#1f1a14" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r="4" fill="#1f1a14" />
        ))}
      </svg>

      <div style={styles.chartFooter}>
        <span>{cleanData[0]?.date}</span>
        <strong>
          Dernier : {lastPoint.value.toFixed(2)}{suffix}
        </strong>
        <span>{cleanData[cleanData.length - 1]?.date}</span>
      </div>
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
    flexWrap: 'wrap',
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
    flexWrap: 'wrap',
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
    boxSizing: 'border-box',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
    gap: 12,
    marginBottom: 14,
  },
  twoColumns: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 12,
    marginBottom: 14,
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
  panel: {
    background: '#fff',
    border: '1px solid #e6ded2',
    borderRadius: 22,
    padding: 14,
    minWidth: 0,
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  panelTitle: {
    margin: 0,
    fontSize: 18,
    letterSpacing: '-0.03em',
  },
  segmented: {
    display: 'inline-flex',
    background: '#f7f3ed',
    border: '1px solid #e6ded2',
    borderRadius: 999,
    padding: 3,
    gap: 3,
  },
  segmentButton: {
    border: 'none',
    borderRadius: 999,
    background: 'transparent',
    padding: '7px 10px',
    fontSize: 12,
    fontWeight: 900,
    cursor: 'pointer',
    color: '#8a7f72',
  },
  segmentButtonActive: {
    background: '#1f1a14',
    color: '#fff',
  },
  list: {
    display: 'grid',
    gap: 8,
  },
  listItem: {
    display: 'grid',
    gridTemplateColumns: '34px 1fr',
    gap: 10,
    alignItems: 'center',
    padding: 10,
    border: '1px solid #f2ece5',
    borderRadius: 16,
  },
  rank: {
    width: 28,
    height: 28,
    borderRadius: 999,
    background: '#f7f3ed',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 900,
  },
  listContent: {
    display: 'grid',
    gap: 3,
    fontSize: 13,
  },
  muted: {
    color: '#8a7f72',
    fontSize: 12,
  },
  stockDashboard: {
    background: '#fff',
    border: '1px solid #e6ded2',
    borderRadius: 24,
    padding: 14,
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  sectionTitle: {
    margin: 0,
    fontSize: 20,
    letterSpacing: '-0.03em',
  },
  sectionSubtitle: {
    margin: '6px 0 0',
    color: '#8a7f72',
    fontSize: 13,
  },
  chartGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 12,
    marginTop: 14,
  },
  chartWrap: {
    display: 'grid',
    gap: 8,
  },
  chart: {
    width: '100%',
    height: 220,
    display: 'block',
  },
  chartFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    color: '#8a7f72',
    fontSize: 11,
    flexWrap: 'wrap',
  },
  empty: {
    padding: 18,
    color: '#8a7f72',
    textAlign: 'center',
    fontSize: 13,
  },
  infoBox: {
  border: '1px solid #e6ded2',
  borderRadius: 14,
  background: '#f7f3ed',
  color: '#8a7f72',
  padding: '12px',
  fontSize: 13,
  fontWeight: 900,
  display: 'flex',
  alignItems: 'center',
  minHeight: 44,
  boxSizing: 'border-box',
},
}