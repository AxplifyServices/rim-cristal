'use client'

import { useEffect, useState } from 'react'
import AdminShell from '../components/AdminShell'
import { adminApi } from '../lib/adminApi'
import { useAdminI18n } from '../i18n/AdminI18nProvider'

export default function AdminStock() {
  const { t } = useAdminI18n()
  const [products, setProducts] = useState([])
  const [pointsOfSale, setPointsOfSale] = useState([])
  const [movements, setMovements] = useState([])
  const [form, setForm] = useState({
    product_id: '',
    point_of_sale_id: '',
    quantity: 1,
    note: '',
  })
  const [globalForm, setGlobalForm] = useState({
    product_id: '',
    mode: 'add',
    quantity: 1,
    note: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    try {
      const [productsData, posData, movementsData] = await Promise.all([
        adminApi.get('/products?include_inactive=true&page_size=20'),
        adminApi.get('/admin/points-of-sale'),
        adminApi.get('/admin/stock/movements'),
      ])

      setProducts(Array.isArray(productsData?.items) ? productsData.items : [])
      setPointsOfSale(Array.isArray(posData) ? posData : [])
      setMovements(Array.isArray(movementsData) ? movementsData : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function updateForm(field, value) {
    setForm(current => ({
      ...current,
      [field]: value,
    }))
  }

  function updateGlobalForm(field, value) {
    setGlobalForm(current => ({
      ...current,
      [field]: value,
    }))
  }

  async function transfer(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      await adminApi.post('/admin/stock/transfer-global-to-pos', {
        product_id: Number(form.product_id),
        point_of_sale_id: Number(form.point_of_sale_id),
        quantity: Number(form.quantity),
        note: form.note || null,
      })

      setForm({
        product_id: '',
        point_of_sale_id: '',
        quantity: 1,
        note: '',
      })

      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function adjustGlobal(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      await adminApi.post('/admin/stock/adjust-global', {
        product_id: Number(globalForm.product_id),
        mode: globalForm.mode,
        quantity: Number(globalForm.quantity),
        note: globalForm.note || null,
      })

      setGlobalForm({
        product_id: '',
        mode: 'add',
        quantity: 1,
        note: '',
      })

      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminShell>
      <h1 style={styles.title}>{t('stock.title')}</h1>
      <p style={styles.subtitle}>{t('stock.subtitle')}</p>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.grid}>
        <form onSubmit={transfer} style={styles.card}>
          <h2 style={styles.sectionTitle}>{t('stock.transfer')}</h2>

          <select
            value={form.product_id}
            onChange={e => updateForm('product_id', e.target.value)}
            style={styles.input}
            required
          >
            <option value="">Produit</option>
            {products.map(product => (
              <option key={product.id} value={product.id}>
                {product.name} — stock global {product.stock || 0}
              </option>
            ))}
          </select>

          <select
            value={form.point_of_sale_id}
            onChange={e => updateForm('point_of_sale_id', e.target.value)}
            style={styles.input}
            required
          >
            <option value="">Point de vente</option>
            {pointsOfSale.map(pos => (
              <option key={pos.id} value={pos.id}>
                {pos.name}
              </option>
            ))}
          </select>

          <input
            type="number"
            min="1"
            value={form.quantity}
            onChange={e => updateForm('quantity', e.target.value)}
            placeholder="Quantité"
            style={styles.input}
            required
          />

          <input
            value={form.note}
            onChange={e => updateForm('note', e.target.value)}
            placeholder="Note"
            style={styles.input}
          />

          <button disabled={saving} style={styles.button}>
            {saving ? t('common.loading') : 'Transférer'}
          </button>
        </form>

        <form onSubmit={adjustGlobal} style={styles.card}>
          <h2 style={styles.sectionTitle}>{t('stock.adjust')}</h2>

          <select
            value={globalForm.product_id}
            onChange={e => updateGlobalForm('product_id', e.target.value)}
            style={styles.input}
            required
          >
            <option value="">Produit</option>
            {products.map(product => (
              <option key={product.id} value={product.id}>
                {product.name} — stock global {product.stock || 0}
              </option>
            ))}
          </select>

          <select
            value={globalForm.mode}
            onChange={e => updateGlobalForm('mode', e.target.value)}
            style={styles.input}
          >
            <option value="add">Ajouter</option>
            <option value="remove">Retirer</option>
            <option value="set">Définir</option>
          </select>

          <input
            type="number"
            min="0"
            value={globalForm.quantity}
            onChange={e => updateGlobalForm('quantity', e.target.value)}
            placeholder="Quantité"
            style={styles.input}
            required
          />

          <input
            value={globalForm.note}
            onChange={e => updateGlobalForm('note', e.target.value)}
            placeholder="Note"
            style={styles.input}
          />

          <button disabled={saving} style={styles.button}>
            {saving ? t('common.loading') : 'Ajuster'}
          </button>
        </form>
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>{t('stock.movements')}</h2>

        {loading ? (
          <div style={styles.empty}>{t('common.loading')}</div>
        ) : movements.length === 0 ? (
          <div style={styles.empty}>{t('common.empty')}</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Produit</th>
                  <th style={styles.th}>Point de vente</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Quantité</th>
                  <th style={styles.th}>Note</th>
                </tr>
              </thead>

              <tbody>
                {movements.map(movement => (
                  <tr key={movement.id}>
                    <td style={styles.td}>
                      {movement.created_at
                        ? new Date(movement.created_at).toLocaleString()
                        : '-'}
                    </td>
                    <td style={styles.td}>
                      {movement.products?.name || movement.product_id || '-'}
                    </td>
                    <td style={styles.td}>
                      {movement.point_of_sales?.name || '-'}
                    </td>
                    <td style={styles.td}>{movement.movement_type}</td>
                    <td style={styles.td}>{movement.quantity}</td>
                    <td style={styles.td}>{movement.note || '-'}</td>
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 14,
    marginBottom: 14,
  },
  card: {
    background: '#fff',
    border: '1px solid #e6ded2',
    borderRadius: 22,
    padding: 14,
    display: 'grid',
    gap: 10,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 18,
  },
  input: {
    height: 42,
    border: '1px solid #e6ded2',
    borderRadius: 13,
    padding: '0 12px',
    fontSize: 14,
    minWidth: 0,
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
  },
  empty: {
    color: '#8a7f72',
    fontSize: 14,
    padding: 10,
  },
}