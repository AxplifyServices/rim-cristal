'use client'

import { useEffect, useState } from 'react'
import AdminShell from '../components/AdminShell'
import { adminApi } from '../lib/adminApi'
import { useAdminI18n } from '../i18n/AdminI18nProvider'

const emptyForm = {
  name: '',
  city: '',
  address: '',
  phone: '',
  manager_name: '',
}

export default function AdminPointsOfSale() {
  const { t } = useAdminI18n()
  const [items, setItems] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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

  async function disablePointOfSale(id) {
    if (!confirm('Désactiver ce point de vente ?')) return

    setError('')

    try {
      await adminApi.del(`/admin/points-of-sale/${id}`)
      await load()
    } catch (err) {
      setError(err.message)
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

        <button disabled={saving} style={styles.button}>
          {saving ? t('common.loading') : t('pointsOfSale.create')}
        </button>
      </form>

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
                  <th style={styles.th}>Stock</th>
                  <th style={styles.th}>Statut</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>

              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td style={styles.td}>{item.name}</td>
                    <td style={styles.td}>{item.city || '-'}</td>
                    <td style={styles.td}>{item.phone || '-'}</td>
                    <td style={styles.td}>{item.manager_name || '-'}</td>
                    <td style={styles.td}>
                      {(item.point_of_sale_stocks || []).reduce(
                        (sum, stock) => sum + Number(stock.quantity || 0),
                        0,
                      )}
                    </td>
                    <td style={styles.td}>
                      {item.is_active ? 'Actif' : 'Inactif'}
                    </td>
                    <td style={styles.td}>
                      <button
                        type="button"
                        onClick={() => disablePointOfSale(item.id)}
                        style={styles.smallButton}
                      >
                        Désactiver
                      </button>
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
  smallButton: {
    border: '1px solid #e6ded2',
    borderRadius: 10,
    background: '#fff',
    padding: '8px 10px',
    fontSize: 12,
    cursor: 'pointer',
  },
  empty: {
    color: '#8a7f72',
    fontSize: 14,
    padding: 10,
  },
}