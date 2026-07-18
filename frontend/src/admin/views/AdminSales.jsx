'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import AdminShell from '../components/AdminShell'
import { useAdminI18n } from '../i18n/AdminI18nProvider'
import { getAdminUser } from '../lib/adminAuth'
import { adminApi } from '../lib/adminApi'

function createEmptyLine() {
  return {
    key:
      `${Date.now()}-${Math.random()}`,

    product_id: '',
    product_size_variant_id:
      '',
    quantity: 1,
  }
}

function getVariantLabel(variant) {
  if (!variant) {
    return 'Taille standard'
  }

  if (variant.label) {
    return variant.label
  }

  const dimensions = [
    variant.width_cm,
    variant.depth_cm,
    variant.height_cm,
  ]
    .filter(
      value =>
        value !== null &&
        value !== undefined &&
        value !== ''
    )

  return dimensions.length > 0
    ? `${dimensions.join(
        ' × '
      )} cm`
    : 'Taille standard'
}

function normalizeAdminProducts(
  response
) {
  return Array.isArray(
    response?.items
  )
    ? response.items
    : []
}

function normalizePosProducts(
  response
) {
  if (!Array.isArray(response)) {
    return []
  }

  const productsById =
    new Map()

  response.forEach(row => {
    const product =
      row.products ||
      row.product

    if (!product) {
      return
    }

    const variant =
      row.product_size_variants ||
      row.size_variant ||
      null

    const productKey =
      String(product.id)

    if (
      !productsById.has(
        productKey
      )
    ) {
      productsById.set(
        productKey,
        {
          ...product,
          product_size_variants:
            [],
        }
      )
    }

    const normalizedProduct =
      productsById.get(
        productKey
      )

    if (variant) {
      normalizedProduct
        .product_size_variants
        .push({
          ...variant,

          pos_quantity:
            Number(
              row.quantity || 0
            ),
        })
    }
  })

  return Array.from(
    productsById.values()
  )
}

function getActiveVariants(
  product,
  isPos
) {
  if (
    !Array.isArray(
      product?.product_size_variants
    )
  ) {
    return []
  }

  return [
    ...product.product_size_variants,
  ]
    .filter(
      variant =>
        variant.is_active !== false &&
        (!isPos ||
          Number(
            variant.pos_quantity ||
              0
          ) > 0)
    )
    .sort((first, second) => {
      if (
        Boolean(first.is_primary) !==
        Boolean(second.is_primary)
      ) {
        return first.is_primary
          ? -1
          : 1
      }

      return (
        Number(
          first.display_order || 0
        ) -
        Number(
          second.display_order || 0
        )
      )
    })
}

function getVariantUnitPrice(
  variant,
  quantity
) {
  const retailPrice =
    Number(
      variant?.price || 0
    )

  const wholesalePrice =
    Number(
      variant?.price_wholesale ||
        0
    )

  const wholesaleMinimum =
    Number(
      variant?.wholesale_min_qty ||
        1
    )

  if (
    wholesalePrice > 0 &&
    Number(quantity) >=
      wholesaleMinimum
  ) {
    return wholesalePrice
  }

  return retailPrice
}

function formatDate(value) {
  if (!value) {
    return '-'
  }

  return new Date(
    value
  ).toLocaleString('fr-FR')
}

export default function AdminSales() {
  const { t } =
    useAdminI18n()

  const [user, setUser] =
    useState(null)

  const [sales, setSales] =
    useState([])

  const [products, setProducts] =
    useState([])

  const [items, setItems] =
    useState(() => [
      createEmptyLine(),
    ])

  const [
    customerName,
    setCustomerName,
  ] = useState('')

  const [
    customerPhone,
    setCustomerPhone,
  ] = useState('')

  const [note, setNote] =
    useState('')

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState('')

  const isPos =
    user?.role ===
    'point_of_sale'

  async function load() {
    setLoading(true)
    setError('')

    try {
      const currentUser =
        getAdminUser()

      setUser(currentUser)

      const salesPath =
        currentUser?.role ===
        'point_of_sale'
          ? '/point-of-sale/sales'
          : '/admin/sales'

      const productsPath =
        currentUser?.role ===
        'point_of_sale'
          ? '/point-of-sale/products'
          : '/products?include_inactive=true&include_unavailable_on_site=true&page_size=1000'

      const [
        salesData,
        productsData,
      ] = await Promise.all([
        adminApi.get(
          salesPath
        ),

        adminApi.get(
          productsPath
        ),
      ])

      setSales(
        Array.isArray(
          salesData
        )
          ? salesData
          : []
      )

      setProducts(
        currentUser?.role ===
          'point_of_sale'
          ? normalizePosProducts(
              productsData
            )
          : normalizeAdminProducts(
              productsData
            )
      )
    } catch (loadError) {
      setError(
        loadError.message
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const productById =
    useMemo(
      () =>
        new Map(
          products.map(
            product => [
              String(
                product.id
              ),
              product,
            ]
          )
        ),
      [products]
    )

  function getLineProduct(line) {
    return (
      productById.get(
        String(
          line.product_id
        )
      ) || null
    )
  }

  function getLineVariants(line) {
    return getActiveVariants(
      getLineProduct(line),
      isPos
    )
  }

  function getLineVariant(line) {
    return (
      getLineVariants(
        line
      ).find(
        variant =>
          String(variant.id) ===
          String(
            line.product_size_variant_id
          )
      ) || null
    )
  }

  const total =
    useMemo(() => {
      return items.reduce(
        (sum, item) => {
          const variant =
            getLineVariant(
              item
            )

          if (!variant) {
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
            getVariantUnitPrice(
              variant,
              quantity
            ) *
              quantity
          )
        },
        0
      )
    }, [
      items,
      products,
      isPos,
    ])

  function updateSaleItem(
    key,
    field,
    value
  ) {
    setItems(current =>
      current.map(item => {
        if (
          item.key !== key
        ) {
          return item
        }

        if (
          field ===
          'product_id'
        ) {
          const product =
            productById.get(
              String(value)
            )

          const variants =
            getActiveVariants(
              product,
              isPos
            )

          const defaultVariant =
            variants.find(
              variant =>
                variant.is_primary
            ) ||
            variants[0] ||
            null

          return {
            ...item,
            product_id: value,

            product_size_variant_id:
              defaultVariant
                ? String(
                    defaultVariant.id
                  )
                : '',
          }
        }

        return {
          ...item,
          [field]: value,
        }
      })
    )
  }

  function addLine() {
    setItems(current => [
      ...current,
      createEmptyLine(),
    ])
  }

  function removeLine(key) {
    setItems(current => {
      if (
        current.length === 1
      ) {
        return [
          createEmptyLine(),
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

    if (!isPos) {
      setError(
        'La vente directe est réservée aux comptes point de vente.'
      )
      return
    }

    const normalizedItems =
      []

    try {
      items.forEach(item => {
        if (!item.product_id) {
          return
        }

        const product =
          getLineProduct(item)

        const variant =
          getLineVariant(item)

        const quantity =
          Number(
            item.quantity
          )

        if (!product) {
          throw new Error(
            'Produit introuvable.'
          )
        }

        if (!variant) {
          throw new Error(
            `Sélectionnez une taille pour ${product.name}.`
          )
        }

        if (
          !Number.isInteger(
            quantity
          ) ||
          quantity <= 0
        ) {
          throw new Error(
            `La quantité de ${product.name} est invalide.`
          )
        }

        const availableStock =
          Number(
            variant.pos_quantity ||
              0
          )

        if (
          quantity >
          availableStock
        ) {
          throw new Error(
            `Stock insuffisant pour ${product.name} — ${getVariantLabel(
              variant
            )}. Disponible : ${availableStock}.`
          )
        }

        normalizedItems.push({
          product_id:
            Number(
              product.id
            ),

          product_size_variant_id:
            String(
              variant.id
            ),

          quantity,
        })
      })
    } catch (validationError) {
      setError(
        validationError.message
      )
      return
    }

    if (
      normalizedItems.length ===
      0
    ) {
      setError(
        'Ajoutez au moins un produit.'
      )
      return
    }

    setSaving(true)
    setError('')

    try {
      await adminApi.post(
        '/point-of-sale/sales',
        {
          customer_name:
            customerName.trim() ||
            null,

          customer_phone:
            customerPhone.trim() ||
            null,

          note:
            note.trim() ||
            null,

          items:
            normalizedItems,
        }
      )

      setItems([
        createEmptyLine(),
      ])

      setCustomerName('')
      setCustomerPhone('')
      setNote('')

      await load()
    } catch (submitError) {
      setError(
        submitError.message
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminShell>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            {t('sales.title')}
          </h1>

          <p
            style={
              styles.subtitle
            }
          >
            {isPos
              ? 'Sélectionnez le produit, sa taille puis la quantité vendue.'
              : t(
                  'sales.subtitleAdmin'
                )}
          </p>
        </div>
      </div>

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      {isPos && (
        <form
          onSubmit={submit}
          style={styles.form}
        >
          <div
            style={
              styles.formHeader
            }
          >
            <div>
              <h2
                style={
                  styles.sectionTitle
                }
              >
                {t(
                  'sales.newSale'
                )}
              </h2>

              <p
                style={
                  styles.sectionDescription
                }
              >
                Le prix et le stock sont
                calculés à partir de la
                taille sélectionnée.
              </p>
            </div>
          </div>

          <div
            style={
              styles.customerGrid
            }
          >
            <FieldLabel label="Nom du client">
              <input
                value={
                  customerName
                }
                onChange={event =>
                  setCustomerName(
                    event.target.value
                  )
                }
                placeholder="Facultatif"
                style={styles.input}
              />
            </FieldLabel>

            <FieldLabel label="Téléphone du client">
              <input
                value={
                  customerPhone
                }
                onChange={event =>
                  setCustomerPhone(
                    event.target.value
                  )
                }
                placeholder="Facultatif"
                style={styles.input}
              />
            </FieldLabel>
          </div>

          <div
            style={
              styles.lines
            }
          >
            {items.map(
              (
                item,
                index
              ) => {
                const product =
                  getLineProduct(
                    item
                  )

                const variants =
                  getLineVariants(
                    item
                  )

                const variant =
                  getLineVariant(
                    item
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
                  getVariantUnitPrice(
                    variant,
                    quantity
                  )

                return (
                  <article
                    key={
                      item.key
                    }
                    style={
                      styles.lineCard
                    }
                  >
                    <div
                      style={
                        styles.lineHeader
                      }
                    >
                      <strong>
                        Article{' '}
                        {index + 1}
                      </strong>

                      <button
                        type="button"
                        onClick={() =>
                          removeLine(
                            item.key
                          )
                        }
                        style={
                          styles.removeButton
                        }
                      >
                        Supprimer
                      </button>
                    </div>

                    <div
                      style={
                        styles.lineGrid
                      }
                    >
                      <FieldLabel label="Produit">
                        <select
                          value={
                            item.product_id
                          }
                          onChange={event =>
                            updateSaleItem(
                              item.key,
                              'product_id',
                              event.target.value
                            )
                          }
                          style={
                            styles.input
                          }
                          required
                        >
                          <option value="">
                            Sélectionner un
                            produit
                          </option>

                          {products.map(
                            productOption => (
                              <option
                                key={
                                  productOption.id
                                }
                                value={
                                  productOption.id
                                }
                              >
                                {
                                  productOption.name
                                }{' '}
                                —{' '}
                                {
                                  productOption.reference
                                }
                              </option>
                            )
                          )}
                        </select>
                      </FieldLabel>

                      <FieldLabel label="Taille">
                        <select
                          value={
                            item.product_size_variant_id
                          }
                          onChange={event =>
                            updateSaleItem(
                              item.key,
                              'product_size_variant_id',
                              event.target.value
                            )
                          }
                          disabled={
                            !item.product_id
                          }
                          style={
                            styles.input
                          }
                          required
                        >
                          <option value="">
                            {item.product_id
                              ? 'Sélectionner une taille'
                              : 'Sélectionnez d’abord un produit'}
                          </option>

                          {variants.map(
                            variantOption => (
                              <option
                                key={
                                  String(
                                    variantOption.id
                                  )
                                }
                                value={
                                  String(
                                    variantOption.id
                                  )
                                }
                              >
                                {getVariantLabel(
                                  variantOption
                                )}
                                {variantOption.is_primary
                                  ? ' — principale'
                                  : ''}
                                {' — '}
                                {Number(
                                  variantOption.price ||
                                    0
                                ).toFixed(
                                  2
                                )}{' '}
                                DH
                                {' — stock '}
                                {Number(
                                  variantOption.pos_quantity ||
                                    0
                                )}
                              </option>
                            )
                          )}
                        </select>
                      </FieldLabel>

                      <FieldLabel label="Quantité">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          max={
                            variant
                              ? Number(
                                  variant.pos_quantity ||
                                    0
                                )
                              : undefined
                          }
                          value={
                            item.quantity
                          }
                          onChange={event =>
                            updateSaleItem(
                              item.key,
                              'quantity',
                              event.target.value
                            )
                          }
                          style={
                            styles.input
                          }
                          required
                        />
                      </FieldLabel>
                    </div>

                    {product &&
                      variant && (
                        <div
                          style={
                            styles.lineSummary
                          }
                        >
                          <span>
                            Taille :{' '}
                            <strong>
                              {getVariantLabel(
                                variant
                              )}
                            </strong>
                          </span>

                          <span>
                            Stock :{' '}
                            <strong>
                              {Number(
                                variant.pos_quantity ||
                                  0
                              )}
                            </strong>
                          </span>

                          <span>
                            Prix unitaire :{' '}
                            <strong>
                              {unitPrice.toFixed(
                                2
                              )}{' '}
                              DH
                            </strong>
                          </span>

                          <span>
                            Total :{' '}
                            <strong>
                              {(
                                unitPrice *
                                quantity
                              ).toFixed(
                                2
                              )}{' '}
                              DH
                            </strong>
                          </span>
                        </div>
                      )}
                  </article>
                )
              }
            )}
          </div>

          <button
            type="button"
            onClick={addLine}
            style={
              styles.secondaryButton
            }
          >
            + Ajouter un article
          </button>

          <FieldLabel label="Note">
            <textarea
              value={note}
              onChange={event =>
                setNote(
                  event.target.value
                )
              }
              placeholder="Commentaire facultatif"
              style={
                styles.textarea
              }
            />
          </FieldLabel>

          <div style={styles.total}>
            <span>
              {t(
                'sales.total'
              )}
            </span>

            <strong>
              {total.toFixed(2)} DH
            </strong>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              ...styles.button,
              ...(saving
                ? styles.disabled
                : {}),
            }}
          >
            {saving
              ? t(
                  'common.loading'
                )
              : t(
                  'sales.submit'
                )}
          </button>
        </form>
      )}

      <div style={styles.card}>
        <h2
          style={
            styles.sectionTitle
          }
        >
          Historique des ventes
        </h2>

        {loading ? (
          <div style={styles.empty}>
            {t(
              'common.loading'
            )}
          </div>
        ) : sales.length ===
          0 ? (
          <div style={styles.empty}>
            {t('common.empty')}
          </div>
        ) : (
          <div
            style={
              styles.tableWrap
            }
          >
            <table
              style={styles.table}
            >
              <thead>
                <tr>
                  <th
                    style={styles.th}
                  >
                    Date
                  </th>

                  <th
                    style={styles.th}
                  >
                    Point de vente
                  </th>

                  <th
                    style={styles.th}
                  >
                    Client
                  </th>

                  <th
                    style={styles.th}
                  >
                    Articles
                  </th>

                  <th
                    style={styles.th}
                  >
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                {sales.map(
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
                        {formatDate(
                          sale.created_at
                        )}
                      </td>

                      <td
                        style={
                          styles.td
                        }
                      >
                        {sale.point_of_sales?.name ||
                          user?.point_of_sale?.name ||
                          '-'}
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
                        {Array.isArray(
                          sale.point_of_sale_sale_items
                        )
                          ? sale.point_of_sale_sale_items.map(
                              item => (
                                <div
                                  key={
                                    item.id
                                  }
                                  style={
                                    styles.saleItem
                                  }
                                >
                                  <strong>
                                    {
                                      item.product_name
                                    }
                                  </strong>

                                  <span>
                                    {item.selected_size ||
                                      'Taille standard'}{' '}
                                    ×{' '}
                                    {
                                      item.quantity
                                    }
                                  </span>
                                </div>
                              )
                            )
                          : '-'}
                      </td>

                      <td
                        style={
                          styles.td
                        }
                      >
                        <strong>
                          {Number(
                            sale.total ||
                              0
                          ).toFixed(
                            2
                          )}{' '}
                          DH
                        </strong>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  )
}

function FieldLabel({
  label,
  children,
}) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>
        {label}
      </span>

      {children}
    </label>
  )
}

const styles = {
  header: {
    marginBottom: 18,
  },

  title: {
    margin: 0,
    fontSize: 28,
    letterSpacing:
      '-0.04em',
  },

  subtitle: {
    margin:
      '6px 0 0',
    color: '#8a7f72',
    fontSize: 14,
  },

  error: {
    marginBottom: 14,
    padding: 12,
    border:
      '1px solid #ffd0d0',
    borderRadius: 14,
    background: '#fff0f0',
    color: '#c0392b',
    fontSize: 13,
  },

  form: {
    display: 'grid',
    gap: 16,
    marginBottom: 16,
    padding: 16,
    border:
      '1px solid #e6ded2',
    borderRadius: 22,
    background: '#fff',
  },

  formHeader: {
    display: 'flex',
    justifyContent:
      'space-between',
    gap: 12,
  },

  sectionTitle: {
    margin: 0,
    fontSize: 18,
  },

  sectionDescription: {
    margin:
      '5px 0 0',
    color: '#8a7f72',
    fontSize: 12,
  },

  customerGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 12,
  },

  lines: {
    display: 'grid',
    gap: 12,
  },

  lineCard: {
    display: 'grid',
    gap: 12,
    padding: 14,
    border:
      '1px solid #e6ded2',
    borderRadius: 18,
    background: '#faf8f5',
  },

  lineHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      'space-between',
    gap: 12,
  },

  lineGrid: {
    display: 'grid',
    gridTemplateColumns:
      'minmax(220px, 2fr) minmax(220px, 2fr) minmax(110px, 0.7fr)',
    gap: 12,
  },

  lineSummary: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 14,
    padding: 10,
    borderRadius: 12,
    background: '#fff',
    color: '#6f665c',
    fontSize: 12,
  },

  field: {
    display: 'grid',
    gap: 6,
    minWidth: 0,
  },

  label: {
    color: '#6f665c',
    fontSize: 12,
    fontWeight: 900,
  },

  input: {
    width: '100%',
    minHeight: 44,
    padding: '0 12px',
    border:
      '1px solid #e6ded2',
    borderRadius: 14,
    background: '#fff',
    color: '#1f1a14',
    fontSize: 13,
    boxSizing:
      'border-box',
  },

  textarea: {
    width: '100%',
    minHeight: 88,
    padding: 12,
    border:
      '1px solid #e6ded2',
    borderRadius: 14,
    resize: 'vertical',
    boxSizing:
      'border-box',
  },

  secondaryButton: {
    justifySelf: 'start',
    border:
      '1px solid #e6ded2',
    borderRadius: 999,
    background: '#fff',
    color: '#1f1a14',
    padding: '10px 14px',
    fontSize: 12,
    fontWeight: 900,
    cursor: 'pointer',
  },

  removeButton: {
    border:
      '1px solid #ffd0d0',
    borderRadius: 999,
    background: '#fff0f0',
    color: '#c0392b',
    padding: '7px 10px',
    fontSize: 11,
    fontWeight: 900,
    cursor: 'pointer',
  },

  total: {
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      'space-between',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    background: '#1f1a14',
    color: '#fff',
    fontSize: 16,
  },

  button: {
    minHeight: 46,
    border: 'none',
    borderRadius: 999,
    background: '#1f1a14',
    color: '#fff',
    fontSize: 13,
    fontWeight: 900,
    cursor: 'pointer',
  },

  disabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },

  card: {
    display: 'grid',
    gap: 14,
    padding: 16,
    border:
      '1px solid #e6ded2',
    borderRadius: 22,
    background: '#fff',
  },

  tableWrap: {
    overflowX: 'auto',
  },

  table: {
    width: '100%',
    minWidth: 900,
    borderCollapse:
      'collapse',
  },

  th: {
    padding: '10px 8px',
    borderBottom:
      '1px solid #eee6dc',
    textAlign: 'left',
    color: '#8a7f72',
    fontSize: 12,
  },

  td: {
    padding: '12px 8px',
    borderBottom:
      '1px solid #f2ece5',
    fontSize: 12,
    verticalAlign: 'top',
  },

  saleItem: {
    display: 'grid',
    gap: 2,
    marginBottom: 6,
  },

  muted: {
    color: '#8a7f72',
    fontSize: 11,
  },

  empty: {
    padding: 24,
    textAlign: 'center',
    color: '#8a7f72',
  },
}