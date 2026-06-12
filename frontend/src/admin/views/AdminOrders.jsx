'use client'

import { useEffect, useState } from 'react'
import AdminShell from '../components/AdminShell'
import { adminApi } from '../lib/adminApi'
import { useAdminI18n } from '../i18n/AdminI18nProvider'

const statuses = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]

export default function AdminOrders() {
  const { t } = useAdminI18n()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    try {
      const data = await adminApi.get('/orders')
      setOrders(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function updateStatus(orderId, status) {
    setSavingId(orderId)
    setError('')

    try {
      await adminApi.patch(`/orders/${orderId}/status`, { status })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <AdminShell>
      <h1 style={styles.title}>{t('orders.title')}</h1>
      <p style={styles.subtitle}>{t('orders.subtitle')}</p>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.card}>
        {loading ? (
          <div style={styles.empty}>{t('common.loading')}</div>
        ) : orders.length === 0 ? (
          <div style={styles.empty}>{t('common.empty')}</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Commande</th>
                  <th style={styles.th}>Client</th>
                  <th style={styles.th}>Ville</th>
                  <th style={styles.th}>Total</th>
                  <th style={styles.th}>Statut</th>
                  <th style={styles.th}>Date</th>
                </tr>
              </thead>

              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td style={styles.td}>{order.order_number}</td>
                    <td style={styles.td}>
                      {order.shipping_first_name} {order.shipping_last_name}
                      <br />
                      <span style={styles.muted}>{order.shipping_phone || '-'}</span>
                    </td>
                    <td style={styles.td}>{order.shipping_city || '-'}</td>
                    <td style={styles.td}>
                      {Number(order.total || 0).toFixed(2)} DH
                    </td>
                    <td style={styles.td}>
                      <select
                        value={order.status}
                        onChange={e => updateStatus(order.id, e.target.value)}
                        disabled={savingId === order.id}
                        style={styles.select}
                      >
                        {statuses.map(status => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={styles.td}>
                      {order.created_at
                        ? new Date(order.created_at).toLocaleString()
                        : '-'}
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
    minWidth: 860,
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
  select: {
    height: 36,
    border: '1px solid #e6ded2',
    borderRadius: 10,
    background: '#fff',
    padding: '0 8px',
  },
  muted: {
    color: '#8a7f72',
    fontSize: 12,
  },
  empty: {
    color: '#8a7f72',
    fontSize: 14,
    padding: 10,
  },
}