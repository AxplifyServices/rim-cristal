'use client'

import { useEffect, useState } from 'react'
import AdminShell from '../components/AdminShell'
import { adminApi } from '../lib/adminApi'
import { useAdminI18n } from '../i18n/AdminI18nProvider'
import { resolveImageUrl } from '../../site/lib/products'

const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'shipped',
  'delivered',
  'cancelled',
]

const PAYMENT_STATUSES = [
  'pending',
  'paid',
  'cancelled',
]

export default function AdminOrders() {
  const { t, locale } = useAdminI18n()

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    try {
      const data = await adminApi.get('/orders')
      setOrders(Array.isArray(data) ? data : [])
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function updateOrder(order, patch) {
    setSavingId(order.id)
    setError('')

    try {
      const updated = await adminApi.patch(
        `/orders/${order.id}/status`,
        patch
      )

      setOrders(current =>
        current.map(item =>
          item.id === order.id
            ? updated
            : item
        )
      )

      setSelectedOrder(current =>
        current?.id === order.id
          ? updated
          : current
      )
    } catch (updateError) {
      setError(updateError.message)
    } finally {
      setSavingId(null)
    }
  }

  function formatDate(value) {
    if (!value) return '-'

    return new Intl.DateTimeFormat(
      locale === 'en' ? 'en-GB' : 'fr-FR',
      {
        dateStyle: 'medium',
        timeStyle: 'short',
      }
    ).format(new Date(value))
  }

  function formatMoney(value) {
    return new Intl.NumberFormat(
      locale === 'en' ? 'en-GB' : 'fr-FR',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    ).format(Number(value || 0))
  }

  return (
    <AdminShell>
      <div className="admin-page-heading">
        <div>
          <h1>{t('orders.title')}</h1>
          <p>{t('orders.subtitle')}</p>
        </div>
      </div>

      {error && (
        <div className="admin-feedback-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="admin-empty-card">
          {t('common.loading')}
        </div>
      ) : orders.length === 0 ? (
        <div className="admin-empty-card">
          {t('common.empty')}
        </div>
      ) : (
        <section className="admin-order-list">
          {orders.map(order => (
            <article
              key={order.id}
              className="admin-order-card"
            >
              <div className="admin-order-card-header">
                <div>
                  <strong>{order.order_number}</strong>
                  <span>{formatDate(order.created_at)}</span>
                </div>

                <strong className="admin-order-total">
                  {formatMoney(order.total)} MAD
                </strong>
              </div>

              <div className="admin-order-customer">
                <strong>
                  {order.shipping_first_name}{' '}
                  {order.shipping_last_name}
                </strong>

                <span>{order.shipping_phone}</span>
                <span>{order.shipping_email}</span>
                <span>
                  {order.shipping_address},{' '}
                  {order.shipping_city}
                </span>
              </div>

              <div className="admin-order-status-grid">
                <label>
                  <span>{t('orders.deliveryStatus')}</span>

                  <select
                    value={order.status}
                    disabled={savingId === order.id}
                    onChange={event =>
                      updateOrder(order, {
                        status: event.target.value,
                        payment_status:
                          order.payment_status,
                        note:
                          t('orders.automaticStatusNote'),
                      })
                    }
                  >
                    {ORDER_STATUSES.map(status => (
                      <option
                        key={status}
                        value={status}
                      >
                        {t(`orders.statuses.${status}`)}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>{t('orders.paymentStatus')}</span>

                  <select
                    value={order.payment_status}
                    disabled={savingId === order.id}
                    onChange={event =>
                      updateOrder(order, {
                        status: order.status,
                        payment_status:
                          event.target.value,
                        note:
                          t('orders.automaticPaymentNote'),
                      })
                    }
                  >
                    {PAYMENT_STATUSES.map(status => (
                      <option
                        key={status}
                        value={status}
                      >
                        {t(
                          `orders.paymentStatuses.${status}`
                        )}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="admin-order-card-footer">
                <span>
                  {order.order_items?.length || 0}{' '}
                  {t('orders.items')}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedOrder(order)
                  }
                >
                  {t('orders.open')}
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {selectedOrder && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) {
              setSelectedOrder(null)
            }
          }}
        >
          <div className="admin-order-modal">
            <div className="admin-modal-header">
              <div>
                <h2>{selectedOrder.order_number}</h2>
                <p>
                  {formatDate(selectedOrder.created_at)}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedOrder(null)
                }
              >
                ×
              </button>
            </div>

            <OrderEditor
              order={selectedOrder}
              saving={savingId === selectedOrder.id}
              t={t}
              formatDate={formatDate}
              formatMoney={formatMoney}
              onSave={patch =>
                updateOrder(
                  selectedOrder,
                  patch
                )
              }
            />
          </div>
        </div>
      )}
    </AdminShell>
  )
}

function OrderEditor({
  order,
  saving,
  t,
  formatDate,
  formatMoney,
  onSave,
}) {
  const [status, setStatus] =
    useState(order.status)

  const [paymentStatus, setPaymentStatus] =
    useState(order.payment_status)

  const [note, setNote] =
    useState('')

useEffect(() => {
  setStatus(order.status)
  setPaymentStatus(order.payment_status)
  setNote('')
}, [
  order.id,
  order.status,
  order.payment_status,
])

  return (
    <div className="admin-order-editor">
      <section className="admin-order-detail-section">
        <h3>{t('orders.customer')}</h3>

        <p>
          <strong>
            {order.shipping_first_name}{' '}
            {order.shipping_last_name}
          </strong>
        </p>

        <p>{order.shipping_phone}</p>
        <p>{order.shipping_email}</p>

        <p>
          {order.shipping_address}
          {order.shipping_apt
            ? `, ${order.shipping_apt}`
            : ''}
          , {order.shipping_city}
        </p>

        {order.notes && (
          <p>{order.notes}</p>
        )}
      </section>

      <section className="admin-order-detail-section">
        <h3>{t('orders.items')}</h3>

        <div className="admin-order-items">
          {order.order_items?.map(item => (
            <article key={item.id}>
              {item.product_image && (
<img
  src={resolveImageUrl(item.product_image)}
  alt={item.product_name}
/>
              )}

              <div>
                <strong>{item.product_name}</strong>

                <span>
                  {item.quantity} ×{' '}
                  {formatMoney(item.unit_price)} MAD
                </span>

                {item.selected_color && (
                  <span>
                    {t('orders.color')} :{' '}
                    {item.selected_color}
                  </span>
                )}
              </div>

              <strong>
                {formatMoney(item.line_total)} MAD
              </strong>
            </article>
          ))}
        </div>

        <div className="admin-order-detail-total">
          <span>{t('orders.total')}</span>
          <strong>
            {formatMoney(order.total)} MAD
          </strong>
        </div>
      </section>

      <section className="admin-order-detail-section">
        <h3>{t('orders.update')}</h3>

        <div className="admin-order-status-grid">
          <label>
            <span>{t('orders.deliveryStatus')}</span>

            <select
              value={status}
              onChange={event =>
                setStatus(event.target.value)
              }
            >
              {ORDER_STATUSES.map(value => (
                <option key={value} value={value}>
                  {t(`orders.statuses.${value}`)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>{t('orders.paymentStatus')}</span>

            <select
              value={paymentStatus}
              onChange={event =>
                setPaymentStatus(
                  event.target.value
                )
              }
            >
              {PAYMENT_STATUSES.map(value => (
                <option key={value} value={value}>
                  {t(
                    `orders.paymentStatuses.${value}`
                  )}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="admin-order-note">
          <span>{t('orders.note')}</span>

          <textarea
            rows="3"
            value={note}
            onChange={event =>
              setNote(event.target.value)
            }
          />
        </label>

        <button
          type="button"
          className="admin-order-save"
          disabled={saving}
          onClick={() =>
            onSave({
              status,
              payment_status: paymentStatus,
              note,
            })
          }
        >
          {saving
            ? t('common.loading')
            : t('common.save')}
        </button>
      </section>

      <section className="admin-order-detail-section">
        <h3>{t('orders.history')}</h3>

        <div className="admin-order-history">
          {order.status_history?.length ? (
            order.status_history.map(history => (
              <article key={history.id}>
                <div>
                  <strong>
                    {history.status
                      ? t(
                          `orders.statuses.${history.status}`
                        )
                      : '-'}
                  </strong>

                  <span>
                    {history.payment_status
                      ? t(
                          `orders.paymentStatuses.${history.payment_status}`
                        )
                      : '-'}
                  </span>
                </div>

                <time>
                  {formatDate(history.created_at)}
                </time>

                {history.note && (
                  <p>{history.note}</p>
                )}
              </article>
            ))
          ) : (
            <p>{t('common.empty')}</p>
          )}
        </div>
      </section>
    </div>
  )
}