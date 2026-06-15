'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminShell from '../components/AdminShell'
import { adminApi } from '../lib/adminApi'
import { useAdminI18n } from '../i18n/AdminI18nProvider'

const emptyForm = {
  name: '',
  city: '',
  address: '',
  phone: '',
  manager_name: '',
  email: '',
  password: '',
}

export default function AdminPointsOfSale() {
  const { t } = useAdminI18n()
  const [items, setItems] = useState([])
  const [selectedPointOfSale, setSelectedPointOfSale] = useState(null)
  const [selectedStock, setSelectedStock] = useState([])
  const [selectedSales, setSelectedSales] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedStockTotal = useMemo(() => {
    return selectedStock.reduce((sum, stock) => {
      return sum + Number(stock.quantity || 0)
    }, 0)
  }, [selectedStock])

  const selectedRevenueTotal = useMemo(() => {
    return selectedSales.reduce((sum, sale) => {
      return sum + Number(sale.total || 0)
    }, 0)
  }, [selectedSales])

  async function load() {
    setLoading(true)
    setError('')

    try {
      const data = await adminApi.get('/admin/points-of-sale')
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function updateField(field, value) {
    setForm(current => ({
      ...current,
      [field]: value,
    }))
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      await adminApi.post('/admin/points-of-sale', form)
      setForm(emptyForm)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function openDetails(pointOfSale) {
    setSelectedPointOfSale(pointOfSale)
    setDetailsLoading(true)
    setError('')

    try {
      const [stockData, salesData] = await Promise.all([
        adminApi.get(`/admin/points-of-sale/${pointOfSale.id}/stock`),
        adminApi.get(`/admin/sales?point_of_sale_id=${pointOfSale.id}`),
      ])

      setSelectedStock(Array.isArray(stockData) ? stockData : [])
      setSelectedSales(Array.isArray(salesData) ? salesData : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setDetailsLoading(false)
    }
  }

  function closeDetails() {
    setSelectedPointOfSale(null)
    setSelectedStock([])
    setSelectedSales([])
  }

  async function disablePointOfSale(id) {
    if (!confirm('Désactiver ce point de vente ?')) return

    setSaving(true)
    setError('')

    try {
      await adminApi.del(`/admin/points-of-sale/${id}`)
      closeDetails()
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminShell>
      <h1 style={styles.title}>{t('pointsOfSale.title')}</h1>
      <p style={styles.subtitle}>{t('pointsOfSale.subtitle')}</p>

      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={submit} style={styles.form}>
        <input
          value={form.name}
          onChange={e => updateField('name', e.target.value)}
          placeholder={t('pointsOfSale.name')}
          style={styles.input}
          required
        />

        <input
          value={form.city}
          onChange={e => updateField('city', e.target.value)}
          placeholder={t('pointsOfSale.city')}
          style={styles.input}
        />

        <input
          value={form.address}
          onChange={e => updateField('address', e.target.value)}
          placeholder={t('pointsOfSale.address')}
          style={styles.input}
        />

        <input
          value={form.phone}
          onChange={e => updateField('phone', e.target.value)}
          placeholder={t('pointsOfSale.phone')}
          style={styles.input}
        />

        <input
          value={form.manager_name}
          onChange={e => updateField('manager_name', e.target.value)}
          placeholder={t('pointsOfSale.manager')}
          style={styles.input}
        />

        <input
          value={form.email}
          onChange={e => updateField('email', e.target.value)}
          placeholder="Email de connexion"
          type="email"
          style={styles.input}
          required
        />

        <input
          value={form.password}
          onChange={e => updateField('password', e.target.value)}
          placeholder="Mot de passe"
          type="password"
          style={styles.input}
          required
        />

        <button disabled={saving} style={styles.button}>
          {saving ? t('common.loading') : t('pointsOfSale.create')}
        </button>
      </form>

      {selectedPointOfSale && (
        <section style={styles.detailsCard}>
          <div style={styles.detailsHeader}>
            <div>
              <h2 style={styles.detailsTitle}>{selectedPointOfSale.name}</h2>
              <p style={styles.detailsSubtitle}>
                {selectedPointOfSale.city || '-'} ·{' '}
                {selectedPointOfSale.manager_name || '-'}
              </p>
            </div>

            <div style={styles.detailsActions}>
              <button
                type="button"
                onClick={() => disablePointOfSale(selectedPointOfSale.id)}
                disabled={saving}
                style={styles.dangerButton}
              >
                Désactiver
              </button>

              <button
                type="button"
                onClick={closeDetails}
                style={styles.smallButton}
              >
                {t('common.close')}
              </button>
            </div>
          </div>

          <div style={styles.kpiGrid}>
            <div style={styles.kpiCard}>
              <span style={styles.kpiLabel}>Stock total</span>
              <strong style={styles.kpiValue}>{selectedStockTotal}</strong>
            </div>

            <div style={styles.kpiCard}>
              <span style={styles.kpiLabel}>Ventes</span>
              <strong style={styles.kpiValue}>{selectedSales.length}</strong>
            </div>

            <div style={styles.kpiCard}>
              <span style={styles.kpiLabel}>Chiffre d'affaires</span>
              <strong style={styles.kpiValue}>
                {selectedRevenueTotal.toFixed(2)} DH
              </strong>
            </div>
          </div>

          {detailsLoading ? (
            <div style={styles.empty}>{t('common.loading')}</div>
          ) : (
            <div style={styles.detailsGrid}>
              <div style={styles.subCard}>
                <h3 style={styles.sectionTitle}>Stock du point de vente</h3>

                {selectedStock.length === 0 ? (
                  <div style={styles.empty}>{t('common.empty')}</div>
                ) : (
                  <div style={styles.tableWrap}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Produit</th>
                          <th style={styles.th}>Référence</th>
                          <th style={styles.th}>Quantité</th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedStock.map(stock => (
                          <tr key={stock.id}>
                            <td style={styles.td}>
                              {stock.products?.name || '-'}
                            </td>
                            <td style={styles.td}>
                              {stock.products?.reference || '-'}
                            </td>
                            <td style={styles.td}>
                              {Number(stock.quantity || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div style={styles.subCard}>
                <h3 style={styles.sectionTitle}>Ventes du point de vente</h3>

                {selectedSales.length === 0 ? (
                  <div style={styles.empty}>{t('common.empty')}</div>
                ) : (
                  <div style={styles.tableWrap}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Date</th>
                          <th style={styles.th}>Client</th>
                          <th style={styles.th}>Articles</th>
                          <th style={styles.th}>Total</th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedSales.map(sale => (
                          <tr key={sale.id}>
                            <td style={styles.td}>
                              {sale.created_at
                                ? new Date(sale.created_at).toLocaleString()
                                : '-'}
                            </td>
                            <td style={styles.td}>
                              {sale.customer_name || '-'}
                              {sale.customer_phone ? (
                                <>
                                  <br />
                                  <span style={styles.muted}>
                                    {sale.customer_phone}
                                  </span>
                                </>
                              ) : null}
                            </td>
                            <td style={styles.td}>
                              {(sale.point_of_sale_sale_items || []).map(item => (
                                <div key={item.id} style={styles.saleItem}>
                                  {item.product_name} × {item.quantity}
                                </div>
                              ))}
                            </td>
                            <td style={styles.td}>
                              {Number(sale.total || 0).toFixed(2)} DH
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      <div style={styles.card}>
        {loading ? (
          <div style={styles.empty}>{t('common.loading')}</div>
        ) : items.length === 0 ? (
          <div style={styles.empty}>{t('common.empty')}</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>{t('pointsOfSale.name')}</th>
                  <th style={styles.th}>{t('pointsOfSale.city')}</th>
                  <th style={styles.th}>{t('pointsOfSale.phone')}</th>
                  <th style={styles.th}>{t('pointsOfSale.manager')}</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Stock</th>
                  <th style={styles.th}>Statut</th>
                </tr>
              </thead>

              <tbody>
                {items.map(item => (
                  <tr
                    key={item.id}
                    onClick={() => openDetails(item)}
                    style={{
                      ...styles.clickableRow,
                      ...(selectedPointOfSale?.id === item.id
                        ? styles.selectedRow
                        : {}),
                    }}
                  >
                    <td style={styles.td}>
                      <strong>{item.name}</strong>
                      <br />
                      <span style={styles.rowHint}>Voir détail</span>
                    </td>
                    <td style={styles.td}>{item.city || '-'}</td>
                    <td style={styles.td}>{item.phone || '-'}</td>
                    <td style={styles.td}>{item.manager_name || '-'}</td>
                    <td style={styles.td}>{item.users?.[0]?.email || '-'}</td>
                    <td style={styles.td}>
                      {(item.point_of_sale_stocks || []).reduce(
                        (sum, stock) => sum + Number(stock.quantity || 0),
                        0,
                      )}
                    </td>
                    <td style={styles.td}>
                      {item.is_active ? 'Actif' : 'Inactif'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
  error: {
    background: '#fff0f0',
    color: '#c0392b',
    border: '1px solid #ffd0d0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    fontSize: 13,
  },
  form: {
    background: '#fff',
    border: '1px solid #e6ded2',
    borderRadius: 22,
    padding: 14,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 10,
    marginBottom: 14,
  },
  input: {
    height: 42,
    border: '1px solid #e6ded2',
    borderRadius: 13,
    padding: '0 12px',
    fontSize: 14,
    boxSizing: 'border-box',
    width: '100%',
  },
  button: {
    height: 42,
    border: 'none',
    borderRadius: 13,
    background: '#1f1a14',
    color: '#fff',
    fontWeight: 800,
    cursor: 'pointer',
  },
  card: {
    background: '#fff',
    border: '1px solid #e6ded2',
    borderRadius: 22,
    padding: 14,
  },
  detailsCard: {
    background: '#fff',
    border: '1px solid #e6ded2',
    borderRadius: 22,
    padding: 14,
    marginBottom: 14,
    display: 'grid',
    gap: 14,
  },
  detailsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
  },
  detailsTitle: {
    margin: 0,
    fontSize: 22,
    letterSpacing: '-0.03em',
  },
  detailsSubtitle: {
    margin: '6px 0 0',
    color: '#8a7f72',
    fontSize: 13,
  },
  detailsActions: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 10,
  },
  kpiCard: {
    background: '#f7f3ed',
    border: '1px solid #e6ded2',
    borderRadius: 18,
    padding: 12,
    display: 'grid',
    gap: 6,
  },
  kpiLabel: {
    color: '#8a7f72',
    fontSize: 12,
    fontWeight: 800,
  },
  kpiValue: {
    color: '#1f1a14',
    fontSize: 20,
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 12,
  },
  subCard: {
    border: '1px solid #eee6dc',
    borderRadius: 18,
    padding: 12,
    minWidth: 0,
  },
  sectionTitle: {
    margin: '0 0 10px',
    fontSize: 16,
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: 760,
  },
  th: {
    textAlign: 'left',
    fontSize: 12,
    color: '#8a7f72',
    padding: '10px 8px',
    borderBottom: '1px solid #eee6dc',
  },
  td: {
    padding: '12px 8px',
    borderBottom: '1px solid #f2ece5',
    fontSize: 13,
    verticalAlign: 'top',
  },
  clickableRow: {
    cursor: 'pointer',
  },
  selectedRow: {
    background: '#f7f3ed',
  },
  rowHint: {
    color: '#8a7f72',
    fontSize: 11,
    fontWeight: 800,
  },
  muted: {
    color: '#8a7f72',
    fontSize: 12,
  },
  saleItem: {
    marginBottom: 4,
  },
  smallButton: {
    border: '1px solid #e6ded2',
    borderRadius: 10,
    background: '#fff',
    padding: '8px 10px',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
  },
  dangerButton: {
    border: '1px solid #ffd0d0',
    borderRadius: 10,
    background: '#fff0f0',
    color: '#c0392b',
    padding: '8px 10px',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
  },
  empty: {
    color: '#8a7f72',
    fontSize: 14,
    padding: 10,
  },
}