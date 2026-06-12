'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminShell from '../components/AdminShell'
import { adminApi } from '../lib/adminApi'
import { getAdminUser } from '../lib/adminAuth'
import { useAdminI18n } from '../i18n/AdminI18nProvider'

export default function AdminSales() {
  const { t } = useAdminI18n()
  const [user, setUser] = useState(null)
  const [sales, setSales] = useState([])
  const [products, setProducts] = useState([])
  const [items, setItems] = useState([{ product_id: '', quantity: 1 }])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isPos = user?.role === 'point_of_sale'

  async function load() {
    setLoading(true)
    setError('')

    try {
      const currentUser = getAdminUser()
      setUser(currentUser)

      const salesPath =
        currentUser?.role === 'point_of_sale'
          ? '/point-of-sale/sales'
          : '/admin/sales'

      const productsPath =
        currentUser?.role === 'point_of_sale'
          ? '/point-of-sale/products'
          : '/products?include_inactive=true&page_size=20'

      const [salesData, productsData] = await Promise.all([
        adminApi.get(salesPath),
        adminApi.get(productsPath),
      ])

      setSales(Array.isArray(salesData) ? salesData : [])

      if (currentUser?.role === 'point_of_sale') {
        setProducts(
          Array.isArray(productsData)
            ? productsData.map(row => ({
                ...row.products,
                pos_quantity: row.quantity,
              }))
            : [],
        )
      } else {
        setProducts(Array.isArray(productsData?.items) ? productsData.items : [])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const total = useMemo(() => {
    return items.reduce((sum, item) => {
      const product = products.find(p => Number(p.id) === Number(item.product_id))
      const quantity = Number(item.quantity || 0)
      return sum + Number(product?.price || 0) * quantity
    }, 0)
  }, [items, products])

  function updateSaleItem(index, field, value) {
    setItems(current =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    )
  }

  function addLine() {
    setItems(current => [...current, { product_id: '', quantity: 1 }])
  }

  function removeLine(index) {
    setItems(current => current.filter((_, itemIndex) => itemIndex !== index))
  }

  async function submit(e) {
    e.preventDefault()

    const payload = {
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
      note: note || null,
      items: items
        .filter(item => item.product_id && Number(item.quantity) > 0)
        .map(item => ({
          product_id: Number(item.product_id),
          quantity: Number(item.quantity),
        })),
    }

    if (payload.items.length === 0) {
      setError('Ajoute au moins un produit.')
      return
    }

    setSaving(true)
    setError('')

    try {
      if (isPos) {
        await adminApi.post('/point-of-sale/sales', payload)
      } else {
        setError('La création de vente depuis admin sera branchée après sélection du point de vente.')
        return
      }

      setItems([{ product_id: '', quantity: 1 }])
      setCustomerName('')
      setCustomerPhone('')
      setNote('')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminShell>
      <h1 style={styles.title}>{t('sales.title')}</h1>
      <p style={styles.subtitle}>
        {isPos ? t('sales.subtitlePos') : t('sales.subtitleAdmin')}
      </p>

      {error && <div style={styles.error}>{error}</div>}

      {isPos && (
        <form onSubmit={submit} style={styles.form}>
          <h2 style={styles.sectionTitle}>{t('sales.newSale')}</h2>

          <div style={styles.customerGrid}>
            <input
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Nom client"
              style={styles.input}
            />

            <input
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              placeholder="Téléphone client"
              style={styles.input}
            />
          </div>

          {items.map((item, index) => (
            <div key={index} style={styles.line}>
              <select
                value={item.product_id}
                onChange={e => updateSaleItem(index, 'product_id', e.target.value)}
                style={styles.input}
                required
              >
                <option value="">Produit</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} — {Number(product.price || 0).toFixed(2)} DH
                    {product.pos_quantity !== undefined
                      ? ` — stock ${product.pos_quantity}`
                      : ''}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={e => updateSaleItem(index, 'quantity', e.target.value)}
                placeholder={t('sales.quantity')}
                style={styles.input}
                required
              />

              <button
                type="button"
                onClick={() => removeLine(index)}
                style={styles.smallButton}
              >
                -
              </button>
            </div>
          ))}

          <button type="button" onClick={addLine} style={styles.secondaryButton}>
            Ajouter une ligne
          </button>

          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Note"
            style={styles.textarea}
          />

          <div style={styles.total}>
            {t('sales.total')} : {total.toFixed(2)} DH
          </div>

          <button disabled={saving} style={styles.button}>
            {saving ? t('common.loading') : t('sales.submit')}
          </button>
        </form>
      )}

      <div style={styles.card}>
        {loading ? (
          <div style={styles.empty}>{t('common.loading')}</div>
        ) : sales.length === 0 ? (
          <div style={styles.empty}>{t('common.empty')}</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Point de vente</th>
                  <th style={styles.th}>Client</th>
                  <th style={styles.th}>Articles</th>
                  <th style={styles.th}>Total</th>
                </tr>
              </thead>

              <tbody>
                {sales.map(sale => (
                  <tr key={sale.id}>
                    <td style={styles.td}>
                      {sale.created_at
                        ? new Date(sale.created_at).toLocaleString()
                        : '-'}
                    </td>
                    <td style={styles.td}>
                      {sale.point_of_sales?.name || user?.point_of_sale?.name || '-'}
                    </td>
                    <td style={styles.td}>
                      {sale.customer_name || '-'}
                      {sale.customer_phone ? ` / ${sale.customer_phone}` : ''}
                    </td>
                    <td style={styles.td}>
                      {(sale.point_of_sale_sale_items || []).length}
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
    gap: 10,
    marginBottom: 14,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 18,
  },
  customerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 10,
  },
  line: {
    display: 'grid',
    gridTemplateColumns: '1fr 110px 42px',
    gap: 8,
  },
  input: {
    height: 42,
    border: '1px solid #e6ded2',
    borderRadius: 13,
    padding: '0 12px',
    fontSize: 14,
    minWidth: 0,
  },
  textarea: {
    border: '1px solid #e6ded2',
    borderRadius: 13,
    padding: 12,
    minHeight: 76,
    fontSize: 14,
    resize: 'vertical',
  },
  button: {
    height: 44,
    border: 'none',
    borderRadius: 13,
    background: '#1f1a14',
    color: '#fff',
    fontWeight: 800,
    cursor: 'pointer',
  },
  secondaryButton: {
    height: 40,
    border: '1px solid #e6ded2',
    borderRadius: 13,
    background: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  },
  smallButton: {
    height: 42,
    border: '1px solid #e6ded2',
    borderRadius: 13,
    background: '#fff',
    cursor: 'pointer',
    fontWeight: 900,
  },
  total: {
    fontWeight: 900,
    fontSize: 18,
  },
  card: {
    background: '#fff',
    border: '1px solid #e6ded2',
    borderRadius: 22,
    padding: 14,
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: 700,
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