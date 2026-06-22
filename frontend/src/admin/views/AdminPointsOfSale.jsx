'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'
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

  const [items, setItems] =
    useState([])

  const [
    selectedPointOfSale,
    setSelectedPointOfSale,
  ] = useState(null)

  const [
    selectedStock,
    setSelectedStock,
  ] = useState([])

  const [
    selectedSales,
    setSelectedSales,
  ] = useState([])

  const [form, setForm] =
    useState(emptyForm)

  const [formOpen, setFormOpen] =
    useState(false)

  const [
    editingPointOfSale,
    setEditingPointOfSale,
  ] = useState(null)

  const [loading, setLoading] =
    useState(true)

  const [
    detailsLoading,
    setDetailsLoading,
  ] = useState(false)

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState('')

  const selectedRevenueTotal =
    useMemo(() => {
      return selectedSales.reduce(
        (sum, sale) => {
          return (
            sum +
            Number(sale.total || 0)
          )
        },
        0
      )
    }, [selectedSales])

  async function load() {
    setLoading(true)
    setError('')

    try {
      const data =
        await adminApi.get(
          '/admin/points-of-sale'
        )

      setItems(
        Array.isArray(data)
          ? data
          : []
      )
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!formOpen) {
      return undefined
    }

    const previousOverflow =
      document.body.style.overflow

    document.body.style.overflow =
      'hidden'

    return () => {
      document.body.style.overflow =
        previousOverflow
    }
  }, [formOpen])

  useEffect(() => {
    if (!formOpen) {
      return undefined
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        closeForm()
      }
    }

    window.addEventListener(
      'keydown',
      handleKeyDown
    )

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      )
    }
  }, [formOpen])

  function updateField(
    field,
    value
  ) {
    setForm(current => ({
      ...current,
      [field]: value,
    }))
  }

  function openCreate() {
    setEditingPointOfSale(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  function openEdit(pointOfSale) {
    setEditingPointOfSale(
      pointOfSale
    )

    setForm({
      name:
        pointOfSale.name || '',

      city:
        pointOfSale.city || '',

      address:
        pointOfSale.address || '',

      phone:
        pointOfSale.phone || '',

      manager_name:
        pointOfSale.manager_name ||
        '',

      email:
        pointOfSale.users?.[0]
          ?.email || '',

      password: '',
    })

    setFormOpen(true)
  }

  function closeForm() {
    if (saving) {
      return
    }

    setFormOpen(false)
    setEditingPointOfSale(null)
    setForm(emptyForm)
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      if (editingPointOfSale) {
        await adminApi.put(
          `/admin/points-of-sale/${editingPointOfSale.id}`,
          {
            name:
              form.name.trim(),

            city:
              form.city.trim() ||
              null,

            address:
              form.address.trim() ||
              null,

            phone:
              form.phone.trim() ||
              null,

            manager_name:
              form.manager_name.trim() ||
              null,
          }
        )
      } else {
        await adminApi.post(
          '/admin/points-of-sale',
          {
            name:
              form.name.trim(),

            city:
              form.city.trim() ||
              null,

            address:
              form.address.trim() ||
              null,

            phone:
              form.phone.trim() ||
              null,

            manager_name:
              form.manager_name.trim() ||
              null,

            email:
              form.email
                .trim()
                .toLowerCase(),

            password:
              form.password,
          }
        )
      }

      closeForm()
      await load()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  async function openDetails(
    pointOfSale
  ) {
    setSelectedPointOfSale(
      pointOfSale
    )

    setDetailsLoading(true)
    setError('')

    try {
      const [
        stockData,
        salesData,
      ] = await Promise.all([
        adminApi.get(
          `/admin/points-of-sale/${pointOfSale.id}/stock`
        ),

        adminApi.get(
          `/admin/sales?point_of_sale_id=${pointOfSale.id}`
        ),
      ])

      setSelectedStock(
        Array.isArray(stockData)
          ? stockData
          : []
      )

      setSelectedSales(
        Array.isArray(salesData)
          ? salesData
          : []
      )
    } catch (detailsError) {
      setError(
        detailsError.message
      )
    } finally {
      setDetailsLoading(false)
    }
  }

  function closeDetails() {
    setSelectedPointOfSale(null)
    setSelectedStock([])
    setSelectedSales([])
  }

  async function disablePointOfSale(
    id
  ) {
    const confirmed =
      window.confirm(
        t(
          'pointsOfSale.confirmDisable'
        )
      )

    if (!confirmed) {
      return
    }

    setSaving(true)
    setError('')

    try {
      await adminApi.del(
        `/admin/points-of-sale/${id}`
      )

      closeDetails()
      await load()
    } catch (deleteError) {
      setError(
        deleteError.message
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminShell>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>
            {t(
              'pointsOfSale.title'
            )}
          </h1>

          <p style={styles.subtitle}>
            {t(
              'pointsOfSale.subtitle'
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          style={styles.button}
        >
          {t(
            'pointsOfSale.create'
          )}
        </button>
      </div>

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      {selectedPointOfSale && (
        <section
          style={styles.detailsCard}
        >
          <div
            style={
              styles.detailsHeader
            }
          >
            <div>
              <h2
                style={
                  styles.detailsTitle
                }
              >
                {
                  selectedPointOfSale.name
                }
              </h2>

              <p
                style={
                  styles.detailsSubtitle
                }
              >
                {selectedPointOfSale.city ||
                  '-'}{' '}
                ·{' '}
                {selectedPointOfSale.manager_name ||
                  '-'}
              </p>
            </div>

            <div
              style={
                styles.detailsActions
              }
            >
              <button
                type="button"
                onClick={() =>
                  openEdit(
                    selectedPointOfSale
                  )
                }
                style={
                  styles.smallButton
                }
              >
                {t('common.edit')}
              </button>

              <button
                type="button"
                onClick={() =>
                  disablePointOfSale(
                    selectedPointOfSale.id
                  )
                }
                disabled={saving}
                style={
                  styles.dangerButton
                }
              >
                {t(
                  'pointsOfSale.disable'
                )}
              </button>

              <button
                type="button"
                onClick={closeDetails}
                style={
                  styles.smallButton
                }
              >
                {t('common.close')}
              </button>
            </div>
          </div>

          <div style={styles.kpiGrid}>
            <div
              style={styles.kpiCard}
            >
              <span
                style={
                  styles.kpiLabel
                }
              >
                {t(
                  'pointsOfSale.sales'
                )}
              </span>

              <strong
                style={
                  styles.kpiValue
                }
              >
                {selectedSales.length}
              </strong>
            </div>

            <div
              style={styles.kpiCard}
            >
              <span
                style={
                  styles.kpiLabel
                }
              >
                {t(
                  'pointsOfSale.revenue'
                )}
              </span>

              <strong
                style={
                  styles.kpiValue
                }
              >
                {selectedRevenueTotal.toFixed(
                  2
                )}{' '}
                DH
              </strong>
            </div>
          </div>

          {detailsLoading ? (
            <div style={styles.empty}>
              {t('common.loading')}
            </div>
          ) : (
            <div
              style={
                styles.detailsGrid
              }
            >
              <div
                style={styles.subCard}
              >
                <h3
                  style={
                    styles.sectionTitle
                  }
                >
                  {t(
                    'pointsOfSale.stockTitle'
                  )}
                </h3>

                {selectedStock.length ===
                0 ? (
                  <div
                    style={
                      styles.empty
                    }
                  >
                    {t(
                      'common.empty'
                    )}
                  </div>
                ) : (
                  <div
                    style={
                      styles.tableWrap
                    }
                  >
                    <table
                      style={
                        styles.table
                      }
                    >
                      <thead>
                        <tr>
                          <th
                            style={
                              styles.th
                            }
                          >
                            {t(
                              'products.product'
                            )}
                          </th>

                          <th
                            style={
                              styles.th
                            }
                          >
                            {t(
                              'products.reference'
                            )}
                          </th>

                          <th
                            style={
                              styles.th
                            }
                          >
                            {t(
                              'sales.quantity'
                            )}
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedStock.map(
                          stock => (
                            <tr
                              key={
                                stock.id
                              }
                            >
                              <td
                                style={
                                  styles.td
                                }
                              >
                                {stock
                                  .products
                                  ?.name ||
                                  '-'}
                              </td>

                              <td
                                style={
                                  styles.td
                                }
                              >
                                {stock
                                  .products
                                  ?.reference ||
                                  '-'}
                              </td>

                              <td
                                style={
                                  styles.td
                                }
                              >
                                {Number(
                                  stock.quantity ||
                                    0
                                )}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div
                style={styles.subCard}
              >
                <h3
                  style={
                    styles.sectionTitle
                  }
                >
                  {t(
                    'pointsOfSale.salesTitle'
                  )}
                </h3>

                {selectedSales.length ===
                0 ? (
                  <div
                    style={
                      styles.empty
                    }
                  >
                    {t(
                      'common.empty'
                    )}
                  </div>
                ) : (
                  <div
                    style={
                      styles.tableWrap
                    }
                  >
                    <table
                      style={
                        styles.table
                      }
                    >
                      <thead>
                        <tr>
                          <th
                            style={
                              styles.th
                            }
                          >
                            {t(
                              'pointsOfSale.date'
                            )}
                          </th>

                          <th
                            style={
                              styles.th
                            }
                          >
                            {t(
                              'sales.customer'
                            )}
                          </th>

                          <th
                            style={
                              styles.th
                            }
                          >
                            {t(
                              'pointsOfSale.items'
                            )}
                          </th>

                          <th
                            style={
                              styles.th
                            }
                          >
                            {t(
                              'sales.total'
                            )}
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedSales.map(
                          sale => (
                            <tr
                              key={
                                sale.id
                              }
                            >
                              <td
                                style={
                                  styles.td
                                }
                              >
                                {sale.created_at
                                  ? new Date(
                                      sale.created_at
                                    ).toLocaleString()
                                  : '-'}
                              </td>

                              <td
                                style={
                                  styles.td
                                }
                              >
                                {sale.customer_name ||
                                  '-'}

                                {sale.customer_phone && (
                                  <>
                                    <br />

                                    <span
                                      style={
                                        styles.muted
                                      }
                                    >
                                      {
                                        sale.customer_phone
                                      }
                                    </span>
                                  </>
                                )}
                              </td>

                              <td
                                style={
                                  styles.td
                                }
                              >
                                {(
                                  sale.point_of_sale_sale_items ||
                                  []
                                ).map(
                                  item => (
                                    <div
                                      key={
                                        item.id
                                      }
                                      style={
                                        styles.saleItem
                                      }
                                    >
                                      {
                                        item.product_name
                                      }{' '}
                                      ×{' '}
                                      {
                                        item.quantity
                                      }
                                    </div>
                                  )
                                )}
                              </td>

                              <td
                                style={
                                  styles.td
                                }
                              >
                                {Number(
                                  sale.total ||
                                    0
                                ).toFixed(
                                  2
                                )}{' '}
                                DH
                              </td>
                            </tr>
                          )
                        )}
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
          <div style={styles.empty}>
            {t('common.loading')}
          </div>
        ) : items.length === 0 ? (
          <div style={styles.empty}>
            {t('common.empty')}
          </div>
        ) : (
          <div
            style={styles.tableWrap}
          >
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>
                    {t(
                      'pointsOfSale.name'
                    )}
                  </th>

                  <th style={styles.th}>
                    {t(
                      'pointsOfSale.city'
                    )}
                  </th>

                  <th style={styles.th}>
                    {t(
                      'pointsOfSale.phone'
                    )}
                  </th>

                  <th style={styles.th}>
                    {t(
                      'pointsOfSale.manager'
                    )}
                  </th>

                  <th style={styles.th}>
                    {t(
                      'pointsOfSale.email'
                    )}
                  </th>

                  <th style={styles.th}>
                    {t(
                      'pointsOfSale.status'
                    )}
                  </th>

                  <th
                    style={
                      styles.actionTh
                    }
                  />
                </tr>
              </thead>

              <tbody>
                {items.map(item => (
                  <tr
                    key={item.id}
                    style={{
                      ...(selectedPointOfSale?.id ===
                      item.id
                        ? styles.selectedRow
                        : {}),
                    }}
                  >
                    <td
                      style={styles.td}
                    >
                      <strong>
                        {item.name}
                      </strong>
                    </td>

                    <td
                      style={styles.td}
                    >
                      {item.city || '-'}
                    </td>

                    <td
                      style={styles.td}
                    >
                      {item.phone || '-'}
                    </td>

                    <td
                      style={styles.td}
                    >
                      {item.manager_name ||
                        '-'}
                    </td>

                    <td
                      style={styles.td}
                    >
                      {item.users?.[0]
                        ?.email || '-'}
                    </td>

                    <td
                      style={styles.td}
                    >
                      {item.is_active
                        ? t(
                            'products.active'
                          )
                        : t(
                            'products.inactive'
                          )}
                    </td>

                    <td
                      style={
                        styles.actionTd
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          openDetails(
                            item
                          )
                        }
                        style={
                          styles.iconButton
                        }
                        aria-label={t(
                          'pointsOfSale.openDetails'
                        )}
                        title={t(
                          'pointsOfSale.openDetails'
                        )}
                      >
                        …
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <div
          style={styles.modalOverlay}
          onMouseDown={event => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeForm()
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="point-of-sale-form-title"
            style={styles.modalDialog}
          >
            <form
              onSubmit={submit}
              style={styles.modalForm}
            >
              <div
                style={
                  styles.modalHeader
                }
              >
                <h2
                  id="point-of-sale-form-title"
                  style={
                    styles.detailsTitle
                  }
                >
                  {editingPointOfSale
                    ? t(
                        'pointsOfSale.edit'
                      )
                    : t(
                        'pointsOfSale.create'
                      )}
                </h2>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  style={
                    styles.smallButton
                  }
                >
                  {t('common.close')}
                </button>
              </div>

              {error && (
                <div
                  style={styles.error}
                >
                  {error}
                </div>
              )}

              <div
                style={styles.formGrid}
              >
                <Field
                  label={t(
                    'pointsOfSale.name'
                  )}
                  value={form.name}
                  onChange={value =>
                    updateField(
                      'name',
                      value
                    )
                  }
                  required
                />

                <Field
                  label={t(
                    'pointsOfSale.city'
                  )}
                  value={form.city}
                  onChange={value =>
                    updateField(
                      'city',
                      value
                    )
                  }
                />

                <Field
                  label={t(
                    'pointsOfSale.address'
                  )}
                  value={form.address}
                  onChange={value =>
                    updateField(
                      'address',
                      value
                    )
                  }
                />

                <Field
                  label={t(
                    'pointsOfSale.phone'
                  )}
                  value={form.phone}
                  onChange={value =>
                    updateField(
                      'phone',
                      value
                    )
                  }
                />

                <Field
                  label={t(
                    'pointsOfSale.manager'
                  )}
                  value={
                    form.manager_name
                  }
                  onChange={value =>
                    updateField(
                      'manager_name',
                      value
                    )
                  }
                />

                {!editingPointOfSale && (
                  <>
                    <Field
                      type="email"
                      label={t(
                        'pointsOfSale.loginEmail'
                      )}
                      value={
                        form.email
                      }
                      onChange={value =>
                        updateField(
                          'email',
                          value
                        )
                      }
                      required
                    />

                    <Field
                      type="password"
                      label={t(
                        'pointsOfSale.password'
                      )}
                      value={
                        form.password
                      }
                      onChange={value =>
                        updateField(
                          'password',
                          value
                        )
                      }
                      minLength={6}
                      required
                    />
                  </>
                )}
              </div>

              <div
                style={
                  styles.modalActions
                }
              >
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  style={
                    styles.smallButton
                  }
                >
                  {t('common.cancel')}
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  style={styles.button}
                >
                  {saving
                    ? t(
                        'common.loading'
                      )
                    : t(
                        'common.save'
                      )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminShell>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  minLength,
}) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>
        {label}
      </span>

      <input
        type={type}
        value={value}
        required={required}
        minLength={minLength}
        onChange={event =>
          onChange(
            event.target.value
          )
        }
        style={styles.input}
      />
    </label>
  )
}

const styles = {
  pageHeader: {
    display: 'flex',
    justifyContent:
      'space-between',
    alignItems: 'flex-start',
    gap: 14,
    flexWrap: 'wrap',
    marginBottom: 18,
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

  error: {
    background: '#fff0f0',
    color: '#c0392b',
    border:
      '1px solid #ffd0d0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    fontSize: 13,
  },

  input: {
    height: 44,
    border:
      '1px solid #e6ded2',
    borderRadius: 13,
    padding: '0 12px',
    fontSize: 14,
    boxSizing: 'border-box',
    width: '100%',
  },

  field: {
    display: 'grid',
    gap: 6,
  },

  label: {
    color: '#8a7f72',
    fontSize: 12,
    fontWeight: 800,
  },

  button: {
    minHeight: 42,
    border: 'none',
    borderRadius: 13,
    background: '#1f1a14',
    color: '#fff',
    padding: '0 16px',
    fontWeight: 800,
    cursor: 'pointer',
  },

  card: {
    background: '#fff',
    border:
      '1px solid #e6ded2',
    borderRadius: 22,
    padding: 14,
  },

  detailsCard: {
    background: '#fff',
    border:
      '1px solid #e6ded2',
    borderRadius: 22,
    padding: 14,
    marginBottom: 14,
    display: 'grid',
    gap: 14,
  },

  detailsHeader: {
    display: 'flex',
    justifyContent:
      'space-between',
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
    gridTemplateColumns:
      'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 10,
  },

  kpiCard: {
    background: '#f7f3ed',
    border:
      '1px solid #e6ded2',
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
    gridTemplateColumns:
      'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 12,
  },

  subCard: {
    border:
      '1px solid #eee6dc',
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
    borderBottom:
      '1px solid #eee6dc',
  },

  td: {
    padding: '12px 8px',
    borderBottom:
      '1px solid #f2ece5',
    fontSize: 13,
    verticalAlign: 'top',
  },

  selectedRow: {
    background: '#f7f3ed',
  },

  muted: {
    color: '#8a7f72',
    fontSize: 12,
  },

  saleItem: {
    marginBottom: 4,
  },

  smallButton: {
    border:
      '1px solid #e6ded2',
    borderRadius: 10,
    background: '#fff',
    padding: '8px 10px',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
  },

  dangerButton: {
    border:
      '1px solid #ffd0d0',
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

  actionTh: {
    width: 52,
    padding: '10px 8px',
    borderBottom:
      '1px solid #eee6dc',
  },

  actionTd: {
    width: 52,
    padding: '10px 8px',
    borderBottom:
      '1px solid #f2ece5',
    textAlign: 'right',
    verticalAlign: 'top',
  },

  iconButton: {
    width: 34,
    height: 34,
    border:
      '1px solid #e6ded2',
    borderRadius: 999,
    background: '#fff',
    color: '#1f1a14',
    fontSize: 18,
    fontWeight: 900,
    lineHeight: '18px',
    cursor: 'pointer',
  },

  modalOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 3000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    boxSizing: 'border-box',
    background:
      'rgba(31, 26, 20, 0.62)',
    backdropFilter: 'blur(4px)',
  },

  modalDialog: {
    width: 'min(760px, 100%)',
    maxHeight:
      'calc(100dvh - 32px)',
    overflow: 'hidden',
    background: '#fff',
    border:
      '1px solid #e6ded2',
    borderRadius: 24,
    boxShadow:
      '0 24px 80px rgba(31, 26, 20, 0.28)',
  },

  modalForm: {
    maxHeight:
      'calc(100dvh - 32px)',
    overflowY: 'auto',
    display: 'grid',
    gap: 16,
    padding: 18,
    boxSizing: 'border-box',
  },

  modalHeader: {
    display: 'flex',
    justifyContent:
      'space-between',
    alignItems: 'center',
    gap: 12,
  },

  formGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 12,
  },

  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    flexWrap: 'wrap',
  },
}