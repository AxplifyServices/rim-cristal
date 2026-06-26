'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import AdminShell from '../components/AdminShell'
import { adminApi } from '../lib/adminApi'
import { getAdminUser } from '../lib/adminAuth'
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

function createEmptyItem() {
  return {
    key: `${Date.now()}-${Math.random()}`,
    product_id: '',
    quantity: 1,
    selected_color: '',
    selected_size: '',
  }
}

function normalizeColors(value) {
  if (Array.isArray(value)) {
    return value
      .map(color => String(color || '').trim())
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)

      if (Array.isArray(parsed)) {
        return parsed
          .map(color => String(color || '').trim())
          .filter(Boolean)
      }
    } catch {
      return value
        .split(',')
        .map(color => color.trim())
        .filter(Boolean)
    }
  }

  return []
}

function getProductPrice(product, quantity) {
  const retailPrice = Number(product?.price || 0)
  const wholesalePrice = Number(
    product?.price_wholesale || 0
  )

  const wholesaleMinimum = Number(
    product?.wholesale_min_qty || 1
  )

  if (
    wholesalePrice > 0 &&
    Number(quantity) >= wholesaleMinimum
  ) {
    return wholesalePrice
  }

  return retailPrice
}

export default function AdminOrders() {
  const { t, locale } = useAdminI18n()

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [createOrderOpen, setCreateOrderOpen] =
    useState(false)

  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    try {
      const data = await adminApi.get('/orders')

      setOrders(
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
    if (!value) {
      return '-'
    }

    return new Intl.DateTimeFormat(
      locale === 'en'
        ? 'en-GB'
        : 'fr-FR',
      {
        dateStyle: 'medium',
        timeStyle: 'short',
      }
    ).format(new Date(value))
  }

  function formatMoney(value) {
    return new Intl.NumberFormat(
      locale === 'en'
        ? 'en-GB'
        : 'fr-FR',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    ).format(Number(value || 0))
  }

  function getOrderOriginLabel(order) {
    const origin =
      order.order_origin ||
      'website'

    return t(
      `orders.origins.${origin}`
    )
  }

  function getStockSourceLabel(order) {
    if (
      order.stock_source_type ===
      'point_of_sale'
    ) {
      return (
        order.point_of_sales?.name ||
        t(
          'orders.sources.point_of_sale'
        )
      )
    }

    return t(
      'orders.sources.global'
    )
  }

  return (
    <AdminShell>
      <div className="admin-page-heading admin-page-heading-with-action">
        <div>
          <h1>{t('orders.title')}</h1>
          <p>{t('orders.subtitle')}</p>
        </div>

        <button
          type="button"
          className="admin-primary-action"
          onClick={() => {
            setError('')
            setCreateOrderOpen(true)
          }}
        >
          <span aria-hidden="true">＋</span>
          {t('orders.create')}
        </button>
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
                  <strong>
                    {order.order_number}
                  </strong>

                  <span>
                    {formatDate(
                      order.created_at
                    )}
                  </span>
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

                <span>
                  {order.shipping_phone}
                </span>

                <span>
                  {order.shipping_email}
                </span>

                <span>
                  {order.shipping_address},{' '}
                  {order.shipping_city}
                </span>

                <span>
                  <strong>
                    {t('orders.origin')} :
                  </strong>{' '}
                  {getOrderOriginLabel(order)}
                </span>

                <span>
                  <strong>
                    {t('orders.source')} :
                  </strong>{' '}
                  {getStockSourceLabel(order)}
                </span>
              </div>

              <div className="admin-order-status-grid">
                <label>
                  <span>
                    {t(
                      'orders.deliveryStatus'
                    )}
                  </span>

                  <select
                    value={order.status}
                    disabled={
                      savingId === order.id ||
                      order.status ===
                        'cancelled'
                    }
                    onChange={event =>
                      updateOrder(order, {
                        status:
                          event.target.value,

                        payment_status:
                          order.payment_status,

                        note:
                          t(
                            'orders.automaticStatusNote'
                          ),
                      })
                    }
                  >
                    {ORDER_STATUSES.map(
                      status => (
                        <option
                          key={status}
                          value={status}
                        >
                          {t(
                            `orders.statuses.${status}`
                          )}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label>
                  <span>
                    {t(
                      'orders.paymentStatus'
                    )}
                  </span>

                  <select
                    value={
                      order.payment_status
                    }
                    disabled={
                      savingId === order.id ||
                      order.status ===
                        'cancelled'
                    }
                    onChange={event =>
                      updateOrder(order, {
                        status:
                          order.status,

                        payment_status:
                          event.target.value,

                        note:
                          t(
                            'orders.automaticPaymentNote'
                          ),
                      })
                    }
                  >
                    {PAYMENT_STATUSES.map(
                      status => (
                        <option
                          key={status}
                          value={status}
                        >
                          {t(
                            `orders.paymentStatuses.${status}`
                          )}
                        </option>
                      )
                    )}
                  </select>
                </label>
              </div>

              <div className="admin-order-card-footer">
                <span>
                  {order.order_items?.length ||
                    0}{' '}
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
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedOrder(null)
            }
          }}
        >
          <div className="admin-order-modal">
            <div className="admin-modal-header">
              <div>
                <h2>
                  {selectedOrder.order_number}
                </h2>

                <p>
                  {formatDate(
                    selectedOrder.created_at
                  )}
                </p>
              </div>

              <button
                type="button"
                aria-label={t('common.close')}
                onClick={() =>
                  setSelectedOrder(null)
                }
              >
                ×
              </button>
            </div>

            <OrderEditor
              order={selectedOrder}
              saving={
                savingId ===
                selectedOrder.id
              }
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

      {createOrderOpen && (
        <CreateWebOrderModal
          t={t}
          locale={locale}
          formatMoney={formatMoney}
          onClose={() =>
            setCreateOrderOpen(false)
          }
          onCreated={async createdOrder => {
            setCreateOrderOpen(false)

            setOrders(current => [
              createdOrder,
              ...current,
            ])
          }}
          onError={message =>
            setError(message)
          }
        />
      )}
    </AdminShell>
  )
}

function CreateWebOrderModal({
  t,
  locale,
  formatMoney,
  onClose,
  onCreated,
  onError,
}) {
  const currentUser =
    getAdminUser()

  const isPointOfSaleUser =
    currentUser?.role ===
    'point_of_sale'

  const ownPointOfSaleId =
    Number(
      currentUser?.point_of_sale_id ||
      currentUser?.point_of_sale?.id ||
      0
    )

  const [stockSourceType, setStockSourceType] =
    useState('global')

  const [pointOfSaleId, setPointOfSaleId] =
    useState(
      isPointOfSaleUser &&
        ownPointOfSaleId
        ? String(ownPointOfSaleId)
        : ''
    )

  const [pointsOfSale, setPointsOfSale] =
    useState([])

  const [products, setProducts] =
    useState([])

  const [items, setItems] =
    useState([
      createEmptyItem(),
    ])

  const [customer, setCustomer] =
    useState({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      address: '',
      apt: '',
      city: '',
      state: '',
      zip: '',
      country: 'Morocco',
    })

  const [notes, setNotes] =
    useState('')

  const [shippingCost, setShippingCost] =
    useState('0')

  const [discountAmount, setDiscountAmount] =
    useState('0')

  const [loadingOptions, setLoadingOptions] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [modalError, setModalError] =
    useState('')

  async function loadOptions({
    sourceType,
    selectedPointOfSaleId,
  }) {
    if (
      sourceType ===
        'point_of_sale' &&
      !selectedPointOfSaleId
    ) {
      setProducts([])
      setLoadingOptions(false)
      return
    }

    setLoadingOptions(true)
    setModalError('')

    try {
      const query =
        new URLSearchParams({
          stock_source_type:
            sourceType,
        })

      if (selectedPointOfSaleId) {
        query.set(
          'point_of_sale_id',
          selectedPointOfSaleId
        )
      }

      const data =
        await adminApi.get(
          `/orders/backoffice/options?${query.toString()}`
        )

      setProducts(
        Array.isArray(data?.products)
          ? data.products
          : []
      )

      if (
        Array.isArray(
          data?.points_of_sale
        )
      ) {
        setPointsOfSale(
          data.points_of_sale
        )
      }
    } catch (loadError) {
      setModalError(
        loadError.message
      )
    } finally {
      setLoadingOptions(false)
    }
  }

  useEffect(() => {
    loadOptions({
      sourceType:
        stockSourceType,

      selectedPointOfSaleId:
        pointOfSaleId,
    })
  }, [
    stockSourceType,
    pointOfSaleId,
  ])

  useEffect(() => {
    setItems([
      createEmptyItem(),
    ])
  }, [
    stockSourceType,
    pointOfSaleId,
  ])

  const productById =
    useMemo(() => {
      return new Map(
        products.map(product => [
          String(product.id),
          product,
        ])
      )
    }, [products])

  const subtotal =
    useMemo(() => {
      return items.reduce(
        (sum, item) => {
          const product =
            productById.get(
              String(
                item.product_id
              )
            )

          if (!product) {
            return sum
          }

          const quantity =
            Math.max(
              1,
              Number(
                item.quantity || 1
              )
            )

          return (
            sum +
            getProductPrice(
              product,
              quantity
            ) *
              quantity
          )
        },
        0
      )
    }, [
      items,
      productById,
    ])

  const total =
    Math.max(
      0,
      subtotal +
        Number(
          shippingCost || 0
        ) -
        Number(
          discountAmount || 0
        )
    )

  function updateCustomer(
    field,
    value
  ) {
    setCustomer(current => ({
      ...current,
      [field]: value,
    }))
  }

  function updateItem(
    key,
    field,
    value
  ) {
    setItems(current =>
      current.map(item =>
        item.key === key
          ? {
              ...item,
              [field]: value,
              ...(field ===
              'product_id'
                ? {
                    selected_color:
                      '',
                    selected_size:
                      '',
                  }
                : {}),
            }
          : item
      )
    )
  }

  function addItem() {
    setItems(current => [
      ...current,
      createEmptyItem(),
    ])
  }

  function removeItem(key) {
    setItems(current => {
      if (
        current.length === 1
      ) {
        return [
          createEmptyItem(),
        ]
      }

      return current.filter(
        item =>
          item.key !== key
      )
    })
  }

  async function submit(event) {
    event.preventDefault()

    setModalError('')
    onError('')

    if (
      stockSourceType ===
        'point_of_sale' &&
      !pointOfSaleId
    ) {
      setModalError(
        t(
          'orders.errors.pointOfSaleRequired'
        )
      )
      return
    }

    const normalizedItems =
      items
        .filter(
          item =>
            item.product_id
        )
        .map(item => {
          const product =
            productById.get(
              String(
                item.product_id
              )
            )

          const quantity =
            Number(
              item.quantity
            )

          if (
            !Number.isInteger(
              quantity
            ) ||
            quantity <= 0
          ) {
            throw new Error(
              t(
                'orders.errors.invalidQuantity'
              )
            )
          }

          if (
            product &&
            quantity >
              Number(
                product.stock || 0
              )
          ) {
            throw new Error(
              t(
                'orders.errors.insufficientStock'
              )
            )
          }

          if (
            product?.has_color_variants &&
            !item.selected_color
          ) {
            throw new Error(
              t(
                'orders.errors.colorRequired'
              )
            )
          }

          return {
            product_id:
              Number(
                item.product_id
              ),

            quantity,

            selected_color:
              item.selected_color ||
              null,

            selected_size:
              item.selected_size ||
              null,
          }
        })

    if (
      normalizedItems.length === 0
    ) {
      setModalError(
        t(
          'orders.errors.productRequired'
        )
      )
      return
    }

    setSaving(true)

    try {
      const createdOrder =
        await adminApi.post(
          '/orders/backoffice',
          {
            stock_source_type:
              stockSourceType,

            point_of_sale_id:
              stockSourceType ===
              'point_of_sale'
                ? Number(
                    pointOfSaleId
                  )
                : null,

            customer,

            items:
              normalizedItems,

            shipping_cost:
              Number(
                shippingCost || 0
              ),

            discount_amount:
              Number(
                discountAmount || 0
              ),

            notes:
              notes.trim() ||
              null,
          }
        )

      await onCreated(
        createdOrder
      )
    } catch (submitError) {
      setModalError(
        submitError.message
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="admin-modal-backdrop"
      onMouseDown={event => {
        if (
          event.target ===
          event.currentTarget &&
          !saving
        ) {
          onClose()
        }
      }}
    >
      <div className="admin-order-modal admin-create-order-modal">
        <div className="admin-modal-header">
          <div>
            <h2>
              {t(
                'orders.createTitle'
              )}
            </h2>

            <p>
              {t(
                'orders.createSubtitle'
              )}
            </p>
          </div>

          <button
            type="button"
            disabled={saving}
            aria-label={t('common.close')}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {modalError && (
          <div className="admin-feedback-error">
            {modalError}
          </div>
        )}

        <form
          className="admin-create-order-form"
          onSubmit={submit}
        >
          <section className="admin-create-order-section">
            <div className="admin-create-order-section-heading">
              <div>
                <h3>
                  {t(
                    'orders.stockSource'
                  )}
                </h3>

                <p>
                  {t(
                    'orders.stockSourceHelp'
                  )}
                </p>
              </div>
            </div>

            <div className="admin-source-options">
              <label
                className={
                  stockSourceType ===
                  'global'
                    ? 'is-selected'
                    : ''
                }
              >
                <input
                  type="radio"
                  name="stock-source"
                  value="global"
                  checked={
                    stockSourceType ===
                    'global'
                  }
                  onChange={() =>
                    setStockSourceType(
                      'global'
                    )
                  }
                />

                <span>
                  <strong>
                    {t(
                      'orders.globalStock'
                    )}
                  </strong>

                  <small>
                    {t(
                      'orders.globalStockHelp'
                    )}
                  </small>
                </span>
              </label>

              <label
                className={
                  stockSourceType ===
                  'point_of_sale'
                    ? 'is-selected'
                    : ''
                }
              >
                <input
                  type="radio"
                  name="stock-source"
                  value="point_of_sale"
                  checked={
                    stockSourceType ===
                    'point_of_sale'
                  }
                  onChange={() => {
                    setStockSourceType(
                      'point_of_sale'
                    )

                    if (
                      isPointOfSaleUser &&
                      ownPointOfSaleId
                    ) {
                      setPointOfSaleId(
                        String(
                          ownPointOfSaleId
                        )
                      )
                    }
                  }}
                />

                <span>
                  <strong>
                    {t(
                      'orders.pointOfSaleStock'
                    )}
                  </strong>

                  <small>
                    {t(
                      'orders.pointOfSaleStockHelp'
                    )}
                  </small>
                </span>
              </label>
            </div>

            {stockSourceType ===
              'point_of_sale' && (
              <label className="admin-create-order-field">
                <span>
                  {t(
                    'orders.pointOfSale'
                  )}
                </span>

                <select
                  value={
                    pointOfSaleId
                  }
                  disabled={
                    isPointOfSaleUser
                  }
                  required
                  onChange={event =>
                    setPointOfSaleId(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    {t(
                      'orders.selectPointOfSale'
                    )}
                  </option>

                  {pointsOfSale.map(
                    pointOfSale => (
                      <option
                        key={
                          pointOfSale.id
                        }
                        value={
                          pointOfSale.id
                        }
                      >
                        {pointOfSale.name}
                        {pointOfSale.city
                          ? ` — ${pointOfSale.city}`
                          : ''}
                      </option>
                    )
                  )}
                </select>
              </label>
            )}
          </section>

          <section className="admin-create-order-section">
            <div className="admin-create-order-section-heading">
              <div>
                <h3>
                  {t(
                    'orders.customer'
                  )}
                </h3>

                <p>
                  {t(
                    'orders.customerHelp'
                  )}
                </p>
              </div>
            </div>

            <div className="admin-create-order-grid">
              <label className="admin-create-order-field">
                <span>
                  {t(
                    'orders.firstName'
                  )}
                </span>

                <input
                  type="text"
                  required
                  value={
                    customer.first_name
                  }
                  onChange={event =>
                    updateCustomer(
                      'first_name',
                      event.target.value
                    )
                  }
                />
              </label>

              <label className="admin-create-order-field">
                <span>
                  {t(
                    'orders.lastName'
                  )}
                </span>

                <input
                  type="text"
                  required
                  value={
                    customer.last_name
                  }
                  onChange={event =>
                    updateCustomer(
                      'last_name',
                      event.target.value
                    )
                  }
                />
              </label>

              <label className="admin-create-order-field">
                <span>
                  {t(
                    'orders.phone'
                  )}
                </span>

                <input
                  type="tel"
                  required
                  value={
                    customer.phone
                  }
                  onChange={event =>
                    updateCustomer(
                      'phone',
                      event.target.value
                    )
                  }
                />
              </label>

              <label className="admin-create-order-field">
                <span>
                  {t(
                    'orders.email'
                  )}
                </span>

                <input
                  type="email"
                  required
                  value={
                    customer.email
                  }
                  onChange={event =>
                    updateCustomer(
                      'email',
                      event.target.value
                    )
                  }
                />
              </label>

              <label className="admin-create-order-field admin-create-order-field-full">
                <span>
                  {t(
                    'orders.address'
                  )}
                </span>

                <input
                  type="text"
                  required
                  value={
                    customer.address
                  }
                  onChange={event =>
                    updateCustomer(
                      'address',
                      event.target.value
                    )
                  }
                />
              </label>

              <label className="admin-create-order-field">
                <span>
                  {t(
                    'orders.addressExtra'
                  )}
                </span>

                <input
                  type="text"
                  value={
                    customer.apt
                  }
                  onChange={event =>
                    updateCustomer(
                      'apt',
                      event.target.value
                    )
                  }
                />
              </label>

              <label className="admin-create-order-field">
                <span>
                  {t(
                    'orders.city'
                  )}
                </span>

                <input
                  type="text"
                  required
                  value={
                    customer.city
                  }
                  onChange={event =>
                    updateCustomer(
                      'city',
                      event.target.value
                    )
                  }
                />
              </label>

              <label className="admin-create-order-field">
                <span>
                  {t(
                    'orders.postalCode'
                  )}
                </span>

                <input
                  type="text"
                  value={
                    customer.zip
                  }
                  onChange={event =>
                    updateCustomer(
                      'zip',
                      event.target.value
                    )
                  }
                />
              </label>

              <label className="admin-create-order-field">
                <span>
                  {t(
                    'orders.country'
                  )}
                </span>

                <input
                  type="text"
                  required
                  value={
                    customer.country
                  }
                  onChange={event =>
                    updateCustomer(
                      'country',
                      event.target.value
                    )
                  }
                />
              </label>
            </div>
          </section>

          <section className="admin-create-order-section">
            <div className="admin-create-order-section-heading">
              <div>
                <h3>
                  {t(
                    'orders.products'
                  )}
                </h3>

                <p>
                  {t(
                    'orders.productsHelp'
                  )}
                </p>
              </div>

              <button
                type="button"
                className="admin-secondary-action"
                onClick={addItem}
              >
                ＋{' '}
                {t(
                  'orders.addProduct'
                )}
              </button>
            </div>

            {loadingOptions ? (
              <div className="admin-order-options-loading">
                {t(
                  'common.loading'
                )}
              </div>
            ) : products.length === 0 ? (
              <div className="admin-order-options-loading">
                {t(
                  'orders.noProductsForSource'
                )}
              </div>
            ) : (
              <div className="admin-create-order-items">
                {items.map(
                  (item, index) => {
                    const product =
                      productById.get(
                        String(
                          item.product_id
                        )
                      )

                    const colors =
                      normalizeColors(
                        product?.colors
                      )

                    const quantity =
                      Math.max(
                        1,
                        Number(
                          item.quantity ||
                            1
                        )
                      )

                    const unitPrice =
                      getProductPrice(
                        product,
                        quantity
                      )

                    const wholesaleApplied =
                      product &&
                      Number(
                        product.price_wholesale ||
                          0
                      ) > 0 &&
                      quantity >=
                        Number(
                          product.wholesale_min_qty ||
                            1
                        )

                    return (
                      <article
                        key={item.key}
                        className="admin-create-order-item"
                      >
                        <div className="admin-create-order-item-top">
                          <strong>
                            {t(
                              'orders.productLine',
                              {
                                number:
                                  index +
                                  1,
                              }
                            )}
                          </strong>

                          <button
                            type="button"
                            className="admin-create-order-remove"
                            aria-label={t(
                              'orders.removeProduct'
                            )}
                            onClick={() =>
                              removeItem(
                                item.key
                              )
                            }
                          >
                            ×
                          </button>
                        </div>

                        <div className="admin-create-order-item-grid">
                          <label className="admin-create-order-field admin-create-order-product-field">
                            <span>
                              {t(
                                'orders.product'
                              )}
                            </span>

                            <select
                              required
                              value={
                                item.product_id
                              }
                              onChange={event =>
                                updateItem(
                                  item.key,
                                  'product_id',
                                  event.target
                                    .value
                                )
                              }
                            >
                              <option value="">
                                {t(
                                  'orders.selectProduct'
                                )}
                              </option>

                              {products.map(
                                option => (
                                  <option
                                    key={
                                      option.id
                                    }
                                    value={
                                      option.id
                                    }
                                  >
                                    {
                                      option.reference
                                    }{' '}
                                    —{' '}
                                    {
                                      option.name
                                    }{' '}
                                    (
                                    {
                                      option.stock
                                    })
                                  </option>
                                )
                              )}
                            </select>
                          </label>

                          <label className="admin-create-order-field">
                            <span>
                              {t(
                                'orders.quantity'
                              )}
                            </span>

                            <input
                              type="number"
                              min="1"
                              max={
                                product?.stock ||
                                undefined
                              }
                              required
                              value={
                                item.quantity
                              }
                              onChange={event =>
                                updateItem(
                                  item.key,
                                  'quantity',
                                  event.target
                                    .value
                                )
                              }
                            />
                          </label>

                          {product?.has_color_variants && (
                            <label className="admin-create-order-field">
                              <span>
                                {t(
                                  'orders.color'
                                )}
                              </span>

                              <select
                                required
                                value={
                                  item.selected_color
                                }
                                onChange={event =>
                                  updateItem(
                                    item.key,
                                    'selected_color',
                                    event.target
                                      .value
                                  )
                                }
                              >
                                <option value="">
                                  {t(
                                    'orders.selectColor'
                                  )}
                                </option>

                                {colors.map(
                                  color => (
                                    <option
                                      key={
                                        color
                                      }
                                      value={
                                        color
                                      }
                                    >
                                      {color}
                                    </option>
                                  )
                                )}
                              </select>
                            </label>
                          )}
                        </div>

                        {product && (
                          <div className="admin-create-order-product-summary">
                            {product.url_image1 && (
                              <img
                                src={resolveImageUrl(
                                  product.url_image1
                                )}
                                alt={
                                  product.name
                                }
                              />
                            )}

                            <div>
                              <strong>
                                {product.name}
                              </strong>

                              <span>
                                {t(
                                  'orders.availableStock'
                                )}{' '}
                                :{' '}
                                {
                                  product.stock
                                }
                              </span>

                              <span>
                                {formatMoney(
                                  unitPrice
                                )}{' '}
                                MAD ×{' '}
                                {quantity}
                              </span>

                              {wholesaleApplied && (
                                <span className="admin-wholesale-badge">
                                  {t(
                                    'orders.wholesaleApplied'
                                  )}
                                </span>
                              )}
                            </div>

                            <strong>
                              {formatMoney(
                                unitPrice *
                                  quantity
                              )}{' '}
                              MAD
                            </strong>
                          </div>
                        )}
                      </article>
                    )
                  }
                )}
              </div>
            )}
          </section>

          <section className="admin-create-order-section">
            <div className="admin-create-order-section-heading">
              <div>
                <h3>
                  {t(
                    'orders.summary'
                  )}
                </h3>
              </div>
            </div>

            <div className="admin-create-order-grid">
              <label className="admin-create-order-field">
                <span>
                  {t(
                    'orders.shippingCost'
                  )}
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    shippingCost
                  }
                  onChange={event =>
                    setShippingCost(
                      event.target.value
                    )
                  }
                />
              </label>

              <label className="admin-create-order-field">
                <span>
                  {t(
                    'orders.discount'
                  )}
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    discountAmount
                  }
                  onChange={event =>
                    setDiscountAmount(
                      event.target.value
                    )
                  }
                />
              </label>

              <label className="admin-create-order-field admin-create-order-field-full">
                <span>
                  {t(
                    'orders.notes'
                  )}
                </span>

                <textarea
                  rows="3"
                  value={notes}
                  onChange={event =>
                    setNotes(
                      event.target.value
                    )
                  }
                />
              </label>
            </div>

            <div className="admin-create-order-totals">
              <div>
                <span>
                  {t(
                    'orders.subtotal'
                  )}
                </span>

                <strong>
                  {formatMoney(
                    subtotal
                  )}{' '}
                  MAD
                </strong>
              </div>

              <div>
                <span>
                  {t(
                    'orders.shippingCost'
                  )}
                </span>

                <strong>
                  {formatMoney(
                    shippingCost
                  )}{' '}
                  MAD
                </strong>
              </div>

              <div>
                <span>
                  {t(
                    'orders.discount'
                  )}
                </span>

                <strong>
                  -{' '}
                  {formatMoney(
                    discountAmount
                  )}{' '}
                  MAD
                </strong>
              </div>

              <div className="admin-create-order-grand-total">
                <span>
                  {t(
                    'orders.total'
                  )}
                </span>

                <strong>
                  {formatMoney(total)}{' '}
                  MAD
                </strong>
              </div>
            </div>
          </section>

          <div className="admin-create-order-actions">
            <button
              type="button"
              className="admin-secondary-action"
              disabled={saving}
              onClick={onClose}
            >
              {t(
                'common.cancel'
              )}
            </button>

            <button
              type="submit"
              className="admin-primary-action"
              disabled={
                saving ||
                loadingOptions ||
                products.length === 0
              }
            >
              {saving
                ? t(
                    'common.loading'
                  )
                : t(
                    'orders.submitOrder'
                  )}
            </button>
          </div>
        </form>
      </div>
    </div>
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

  const [
    paymentStatus,
    setPaymentStatus,
  ] = useState(
    order.payment_status
  )

  const [note, setNote] =
    useState('')

  useEffect(() => {
    setStatus(order.status)

    setPaymentStatus(
      order.payment_status
    )

    setNote('')
  }, [
    order.id,
    order.status,
    order.payment_status,
  ])

  const orderCancelled =
    order.status ===
    'cancelled'

  return (
    <div className="admin-order-editor">
      <section className="admin-order-detail-section">
        <h3>
          {t('orders.customer')}
        </h3>

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

        <p>
          <strong>
            {t('orders.origin')} :
          </strong>{' '}
          {t(
            `orders.origins.${
              order.order_origin ||
              'website'
            }`
          )}
        </p>

        <p>
          <strong>
            {t('orders.source')} :
          </strong>{' '}

          {order.stock_source_type ===
          'point_of_sale'
            ? order.point_of_sales?.name ||
              t(
                'orders.sources.point_of_sale'
              )
            : t(
                'orders.sources.global'
              )}
        </p>

        {order.notes && (
          <p>{order.notes}</p>
        )}
      </section>

      <section className="admin-order-detail-section">
        <h3>
          {t('orders.items')}
        </h3>

        <div className="admin-order-items">
          {order.order_items?.map(item => (
            <article key={item.id}>
              {item.product_image && (
                <img
                  src={resolveImageUrl(
                    item.product_image
                  )}
                  alt={item.product_name}
                />
              )}

              <div>
                <strong>
                  {item.product_name}
                </strong>

                <span>
                  {item.quantity} ×{' '}
                  {formatMoney(
                    item.unit_price
                  )}{' '}
                  MAD
                </span>

                {item.selected_color && (
                  <span>
                    {t('orders.color')} :{' '}
                    {item.selected_color}
                  </span>
                )}
              </div>

              <strong>
                {formatMoney(
                  item.line_total
                )}{' '}
                MAD
              </strong>
            </article>
          ))}
        </div>

        <div className="admin-order-detail-total">
          <span>
            {t('orders.total')}
          </span>

          <strong>
            {formatMoney(
              order.total
            )}{' '}
            MAD
          </strong>
        </div>
      </section>

      <section className="admin-order-detail-section">
        <h3>
          {t('orders.update')}
        </h3>

        {orderCancelled && (
          <div className="admin-order-cancelled-message">
            {t(
              'orders.cancelledCannotReopen'
            )}
          </div>
        )}

        <div className="admin-order-status-grid">
          <label>
            <span>
              {t(
                'orders.deliveryStatus'
              )}
            </span>

            <select
              value={status}
              disabled={
                orderCancelled
              }
              onChange={event =>
                setStatus(
                  event.target.value
                )
              }
            >
              {ORDER_STATUSES.map(
                value => (
                  <option
                    key={value}
                    value={value}
                  >
                    {t(
                      `orders.statuses.${value}`
                    )}
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            <span>
              {t(
                'orders.paymentStatus'
              )}
            </span>

            <select
              value={paymentStatus}
              disabled={
                orderCancelled
              }
              onChange={event =>
                setPaymentStatus(
                  event.target.value
                )
              }
            >
              {PAYMENT_STATUSES.map(
                value => (
                  <option
                    key={value}
                    value={value}
                  >
                    {t(
                      `orders.paymentStatuses.${value}`
                    )}
                  </option>
                )
              )}
            </select>
          </label>
        </div>

        <label className="admin-order-note">
          <span>
            {t('orders.note')}
          </span>

          <textarea
            rows="3"
            value={note}
            disabled={
              orderCancelled
            }
            onChange={event =>
              setNote(
                event.target.value
              )
            }
          />
        </label>

        <button
          type="button"
          className="admin-order-save"
          disabled={
            saving ||
            orderCancelled
          }
          onClick={() =>
            onSave({
              status,
              payment_status:
                paymentStatus,
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
        <h3>
          {t('orders.history')}
        </h3>

        <div className="admin-order-history">
          {order.status_history?.length ? (
            order.status_history.map(
              history => (
                <article
                  key={history.id}
                >
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
                    {formatDate(
                      history.created_at
                    )}
                  </time>

                  {history.note && (
                    <p>
                      {history.note}
                    </p>
                  )}
                </article>
              )
            )
          ) : (
            <p>
              {t('common.empty')}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}