'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import AdminShell from '../components/AdminShell'
import { useAdminI18n } from '../i18n/AdminI18nProvider'
import { adminApi } from '../lib/adminApi'

function createTransferForm() {
  return {
    product_id: '',
    product_size_variant_id: '',
    point_of_sale_id: '',
    quantity: 1,
    note: '',
  }
}

function createGlobalForm() {
  return {
    product_id: '',
    product_size_variant_id: '',
    mode: 'add',
    quantity: 1,
    note: '',
  }
}

function getVariants(product) {
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
        variant.is_active !== false
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
    .map(value =>
      Number(value)
    )
    .filter(Number.isFinite)

  if (dimensions.length === 0) {
    return 'Taille standard'
  }

  return `${dimensions.join(
    ' × '
  )} cm`
}

function getMovementVariant(
  movement
) {
  return (
    movement.product_size_variants ||
    movement.size_variant ||
    null
  )
}

function formatDate(value) {
  if (!value) {
    return '-'
  }

  return new Date(
    value
  ).toLocaleString('fr-FR')
}

export default function AdminStock() {
  const { t } =
    useAdminI18n()

  const [products, setProducts] =
    useState([])

  const [
    pointsOfSale,
    setPointsOfSale,
  ] = useState([])

  const [
    movements,
    setMovements,
  ] = useState([])

  const [form, setForm] =
    useState(() =>
      createTransferForm()
    )

  const [
    globalForm,
    setGlobalForm,
  ] = useState(() =>
    createGlobalForm()
  )

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState('')

  const transferProduct =
    useMemo(
      () =>
        products.find(
          product =>
            String(product.id) ===
            String(
              form.product_id
            )
        ) || null,
      [
        products,
        form.product_id,
      ]
    )

  const transferVariants =
    useMemo(
      () =>
        getVariants(
          transferProduct
        ),
      [transferProduct]
    )

  const selectedTransferVariant =
    useMemo(
      () =>
        transferVariants.find(
          variant =>
            String(variant.id) ===
            String(
              form.product_size_variant_id
            )
        ) || null,
      [
        transferVariants,
        form.product_size_variant_id,
      ]
    )

  const globalProduct =
    useMemo(
      () =>
        products.find(
          product =>
            String(product.id) ===
            String(
              globalForm.product_id
            )
        ) || null,
      [
        products,
        globalForm.product_id,
      ]
    )

  const globalVariants =
    useMemo(
      () =>
        getVariants(
          globalProduct
        ),
      [globalProduct]
    )

  const selectedGlobalVariant =
    useMemo(
      () =>
        globalVariants.find(
          variant =>
            String(variant.id) ===
            String(
              globalForm.product_size_variant_id
            )
        ) || null,
      [
        globalVariants,
        globalForm.product_size_variant_id,
      ]
    )

  async function load() {
    setLoading(true)
    setError('')

    try {
      const [
        productsData,
        posData,
        movementsData,
      ] = await Promise.all([
        adminApi.get(
          '/products?include_inactive=true&include_unavailable_on_site=true&page_size=1000'
        ),

        adminApi.get(
          '/admin/points-of-sale'
        ),

        adminApi.get(
          '/admin/stock/movements'
        ),
      ])

      setProducts(
        Array.isArray(
          productsData?.items
        )
          ? productsData.items
          : []
      )

      setPointsOfSale(
        Array.isArray(posData)
          ? posData
          : []
      )

      setMovements(
        Array.isArray(
          movementsData
        )
          ? movementsData
          : []
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

  function updateTransferForm(
    field,
    value
  ) {
    setForm(current => {
      if (
        field === 'product_id'
      ) {
        return {
          ...current,
          product_id: value,
          product_size_variant_id:
            '',
        }
      }

      return {
        ...current,
        [field]: value,
      }
    })
  }

  function updateGlobalForm(
    field,
    value
  ) {
    setGlobalForm(current => {
      if (
        field === 'product_id'
      ) {
        return {
          ...current,
          product_id: value,
          product_size_variant_id:
            '',
        }
      }

      return {
        ...current,
        [field]: value,
      }
    })
  }

  useEffect(() => {
    if (
      !form.product_id ||
      form.product_size_variant_id ||
      transferVariants.length === 0
    ) {
      return
    }

    const primaryVariant =
      transferVariants.find(
        variant =>
          variant.is_primary
      ) ||
      transferVariants[0]

    updateTransferForm(
      'product_size_variant_id',
      String(
        primaryVariant.id
      )
    )
  }, [
    form.product_id,
    form.product_size_variant_id,
    transferVariants,
  ])

  useEffect(() => {
    if (
      !globalForm.product_id ||
      globalForm.product_size_variant_id ||
      globalVariants.length === 0
    ) {
      return
    }

    const primaryVariant =
      globalVariants.find(
        variant =>
          variant.is_primary
      ) ||
      globalVariants[0]

    updateGlobalForm(
      'product_size_variant_id',
      String(
        primaryVariant.id
      )
    )
  }, [
    globalForm.product_id,
    globalForm.product_size_variant_id,
    globalVariants,
  ])

  async function transfer(event) {
    event.preventDefault()

    if (
      !form.product_id ||
      !form.product_size_variant_id ||
      !form.point_of_sale_id
    ) {
      setError(
        'Sélectionnez le produit, la taille et le point de vente.'
      )
      return
    }

    const quantity =
      Number(form.quantity)

    if (
      !Number.isInteger(
        quantity
      ) ||
      quantity <= 0
    ) {
      setError(
        'La quantité doit être un entier supérieur à zéro.'
      )
      return
    }

    if (
      selectedTransferVariant &&
      quantity >
        Number(
          selectedTransferVariant.stock ||
            0
        )
    ) {
      setError(
        `Stock global insuffisant pour ${getVariantLabel(
          selectedTransferVariant
        )}.`
      )
      return
    }

    setSaving(true)
    setError('')

    try {
      await adminApi.post(
        '/admin/stock/transfer-global-to-pos',
        {
          product_id:
            Number(
              form.product_id
            ),

          product_size_variant_id:
            String(
              form.product_size_variant_id
            ),

          point_of_sale_id:
            Number(
              form.point_of_sale_id
            ),

          quantity,

          note:
            form.note.trim() ||
            null,
        }
      )

      setForm(
        createTransferForm()
      )

      await load()
    } catch (transferError) {
      setError(
        transferError.message
      )
    } finally {
      setSaving(false)
    }
  }

  async function adjustGlobal(
    event
  ) {
    event.preventDefault()

    if (
      !globalForm.product_id ||
      !globalForm.product_size_variant_id
    ) {
      setError(
        'Sélectionnez le produit et la taille.'
      )
      return
    }

    const quantity =
      Number(
        globalForm.quantity
      )

    if (
      !Number.isInteger(
        quantity
      ) ||
      quantity < 0
    ) {
      setError(
        'La quantité doit être un entier positif ou nul.'
      )
      return
    }

    if (
      globalForm.mode ===
        'remove' &&
      selectedGlobalVariant &&
      quantity >
        Number(
          selectedGlobalVariant.stock ||
            0
        )
    ) {
      setError(
        `Impossible de retirer plus de ${Number(
          selectedGlobalVariant.stock ||
            0
        )} unité(s).`
      )
      return
    }

    setSaving(true)
    setError('')

    try {
      await adminApi.post(
        '/admin/stock/adjust-global',
        {
          product_id:
            Number(
              globalForm.product_id
            ),

          product_size_variant_id:
            String(
              globalForm.product_size_variant_id
            ),

          mode:
            globalForm.mode,

          quantity,

          note:
            globalForm.note.trim() ||
            null,
        }
      )

      setGlobalForm(
        createGlobalForm()
      )

      await load()
    } catch (adjustError) {
      setError(
        adjustError.message
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
            {t('stock.title')}
          </h1>

          <p
            style={
              styles.subtitle
            }
          >
            Gérez le stock de chaque
            taille séparément.
          </p>
        </div>
      </div>

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      <div style={styles.grid}>
        <form
          onSubmit={transfer}
          style={styles.card}
        >
          <div
            style={
              styles.cardHeader
            }
          >
            <div>
              <h2
                style={
                  styles.sectionTitle
                }
              >
                {t(
                  'stock.transfer'
                )}
              </h2>

              <p
                style={
                  styles.sectionDescription
                }
              >
                Transférer une taille
                précise du stock global
                vers un point de vente.
              </p>
            </div>
          </div>

          <FieldLabel label="Produit">
            <select
              value={
                form.product_id
              }
              onChange={event =>
                updateTransferForm(
                  'product_id',
                  event.target.value
                )
              }
              style={styles.input}
              required
            >
              <option value="">
                Sélectionner un produit
              </option>

              {products.map(
                product => (
                  <option
                    key={
                      product.id
                    }
                    value={
                      product.id
                    }
                  >
                    {product.name} —{' '}
                    {product.reference}
                  </option>
                )
              )}
            </select>
          </FieldLabel>

          <FieldLabel label="Taille">
            <select
              value={
                form.product_size_variant_id
              }
              onChange={event =>
                updateTransferForm(
                  'product_size_variant_id',
                  event.target.value
                )
              }
              style={styles.input}
              disabled={
                !form.product_id
              }
              required
            >
              <option value="">
                {form.product_id
                  ? 'Sélectionner une taille'
                  : 'Sélectionnez d’abord un produit'}
              </option>

              {transferVariants.map(
                variant => (
                  <option
                    key={
                      String(
                        variant.id
                      )
                    }
                    value={
                      String(
                        variant.id
                      )
                    }
                  >
                    {getVariantLabel(
                      variant
                    )}
                    {variant.is_primary
                      ? ' — principale'
                      : ''}
                    {' — stock '}
                    {Number(
                      variant.stock ||
                        0
                    )}
                  </option>
                )
              )}
            </select>
          </FieldLabel>

          {selectedTransferVariant && (
            <StockSummary
              variant={
                selectedTransferVariant
              }
            />
          )}

          <FieldLabel label="Point de vente">
            <select
              value={
                form.point_of_sale_id
              }
              onChange={event =>
                updateTransferForm(
                  'point_of_sale_id',
                  event.target.value
                )
              }
              style={styles.input}
              required
            >
              <option value="">
                Sélectionner un point de
                vente
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
          </FieldLabel>

          <FieldLabel label="Quantité à transférer">
            <input
              type="number"
              min="1"
              step="1"
              max={
                selectedTransferVariant
                  ? Number(
                      selectedTransferVariant.stock ||
                        0
                    )
                  : undefined
              }
              value={
                form.quantity
              }
              onChange={event =>
                updateTransferForm(
                  'quantity',
                  event.target.value
                )
              }
              style={styles.input}
              required
            />
          </FieldLabel>

          <FieldLabel label="Note">
            <textarea
              value={form.note}
              onChange={event =>
                updateTransferForm(
                  'note',
                  event.target.value
                )
              }
              placeholder="Motif ou commentaire"
              style={
                styles.textarea
              }
            />
          </FieldLabel>

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
              : 'Transférer'}
          </button>
        </form>

        <form
          onSubmit={
            adjustGlobal
          }
          style={styles.card}
        >
          <div
            style={
              styles.cardHeader
            }
          >
            <div>
              <h2
                style={
                  styles.sectionTitle
                }
              >
                {t(
                  'stock.adjust'
                )}
              </h2>

              <p
                style={
                  styles.sectionDescription
                }
              >
                Ajouter, retirer ou
                définir le stock global
                d’une taille.
              </p>
            </div>
          </div>

          <FieldLabel label="Produit">
            <select
              value={
                globalForm.product_id
              }
              onChange={event =>
                updateGlobalForm(
                  'product_id',
                  event.target.value
                )
              }
              style={styles.input}
              required
            >
              <option value="">
                Sélectionner un produit
              </option>

              {products.map(
                product => (
                  <option
                    key={
                      product.id
                    }
                    value={
                      product.id
                    }
                  >
                    {product.name} —{' '}
                    {product.reference}
                  </option>
                )
              )}
            </select>
          </FieldLabel>

          <FieldLabel label="Taille">
            <select
              value={
                globalForm.product_size_variant_id
              }
              onChange={event =>
                updateGlobalForm(
                  'product_size_variant_id',
                  event.target.value
                )
              }
              style={styles.input}
              disabled={
                !globalForm.product_id
              }
              required
            >
              <option value="">
                {globalForm.product_id
                  ? 'Sélectionner une taille'
                  : 'Sélectionnez d’abord un produit'}
              </option>

              {globalVariants.map(
                variant => (
                  <option
                    key={
                      String(
                        variant.id
                      )
                    }
                    value={
                      String(
                        variant.id
                      )
                    }
                  >
                    {getVariantLabel(
                      variant
                    )}
                    {variant.is_primary
                      ? ' — principale'
                      : ''}
                    {' — stock '}
                    {Number(
                      variant.stock ||
                        0
                    )}
                  </option>
                )
              )}
            </select>
          </FieldLabel>

          {selectedGlobalVariant && (
            <StockSummary
              variant={
                selectedGlobalVariant
              }
            />
          )}

          <FieldLabel label="Opération">
            <select
              value={
                globalForm.mode
              }
              onChange={event =>
                updateGlobalForm(
                  'mode',
                  event.target.value
                )
              }
              style={styles.input}
            >
              <option value="add">
                Ajouter au stock
              </option>

              <option value="remove">
                Retirer du stock
              </option>

              <option value="set">
                Définir le stock total
              </option>
            </select>
          </FieldLabel>

          <FieldLabel label="Quantité">
            <input
              type="number"
              min="0"
              step="1"
              value={
                globalForm.quantity
              }
              onChange={event =>
                updateGlobalForm(
                  'quantity',
                  event.target.value
                )
              }
              style={styles.input}
              required
            />
          </FieldLabel>

          <FieldLabel label="Note">
            <textarea
              value={
                globalForm.note
              }
              onChange={event =>
                updateGlobalForm(
                  'note',
                  event.target.value
                )
              }
              placeholder="Motif ou commentaire"
              style={
                styles.textarea
              }
            />
          </FieldLabel>

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
              : 'Ajuster le stock'}
          </button>
        </form>
      </div>

      <div style={styles.card}>
        <div
          style={
            styles.cardHeader
          }
        >
          <div>
            <h2
              style={
                styles.sectionTitle
              }
            >
              {t(
                'stock.movements'
              )}
            </h2>

            <p
              style={
                styles.sectionDescription
              }
            >
              Chaque mouvement précise
              maintenant la taille
              concernée.
            </p>
          </div>
        </div>

        {loading ? (
          <div style={styles.empty}>
            {t(
              'common.loading'
            )}
          </div>
        ) : movements.length ===
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
                    Produit
                  </th>

                  <th
                    style={styles.th}
                  >
                    Taille
                  </th>

                  <th
                    style={styles.th}
                  >
                    Point de vente
                  </th>

                  <th
                    style={styles.th}
                  >
                    Type
                  </th>

                  <th
                    style={styles.th}
                  >
                    Quantité
                  </th>

                  <th
                    style={styles.th}
                  >
                    Avant → après
                  </th>

                  <th
                    style={styles.th}
                  >
                    Note
                  </th>
                </tr>
              </thead>

              <tbody>
                {movements.map(
                  movement => {
                    const variant =
                      getMovementVariant(
                        movement
                      )

                    const isPosMovement =
                      movement.stock_pos_before !==
                        null &&
                      movement.stock_pos_before !==
                        undefined

                    const before =
                      isPosMovement
                        ? movement.stock_pos_before
                        : movement.stock_global_before

                    const after =
                      isPosMovement
                        ? movement.stock_pos_after
                        : movement.stock_global_after

                    return (
                      <tr
                        key={
                          movement.id
                        }
                      >
                        <td
                          style={
                            styles.td
                          }
                        >
                          {formatDate(
                            movement.created_at
                          )}
                        </td>

                        <td
                          style={
                            styles.td
                          }
                        >
                          <strong>
                            {movement.products?.name ||
                              movement.product_name ||
                              `Produit ${movement.product_id}`}
                          </strong>

                          <br />

                          <span
                            style={
                              styles.muted
                            }
                          >
                            {movement.products?.reference ||
                              '-'}
                          </span>
                        </td>

                        <td
                          style={
                            styles.td
                          }
                        >
                          {variant
                            ? getVariantLabel(
                                variant
                              )
                            : movement.product_size_variant_id
                              ? `Variante ${movement.product_size_variant_id}`
                              : '-'}
                        </td>

                        <td
                          style={
                            styles.td
                          }
                        >
                          {movement.point_of_sales?.name ||
                            '-'}
                        </td>

                        <td
                          style={
                            styles.td
                          }
                        >
                          {movement.movement_type}
                        </td>

                        <td
                          style={{
                            ...styles.td,
                            ...(Number(
                              movement.quantity
                            ) < 0
                              ? styles.negative
                              : styles.positive),
                          }}
                        >
                          {Number(
                            movement.quantity
                          ) > 0
                            ? '+'
                            : ''}
                          {movement.quantity}
                        </td>

                        <td
                          style={
                            styles.td
                          }
                        >
                          {before ??
                            '-'}{' '}
                          →{' '}
                          {after ??
                            '-'}
                        </td>

                        <td
                          style={
                            styles.td
                          }
                        >
                          {movement.note ||
                            '-'}
                        </td>
                      </tr>
                    )
                  }
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

function StockSummary({
  variant,
}) {
  return (
    <div style={styles.summary}>
      <div>
        <span
          style={
            styles.summaryLabel
          }
        >
          Taille
        </span>

        <strong>
          {getVariantLabel(
            variant
          )}
        </strong>
      </div>

      <div>
        <span
          style={
            styles.summaryLabel
          }
        >
          Prix
        </span>

        <strong>
          {Number(
            variant.price || 0
          ).toFixed(2)}{' '}
          DH
        </strong>
      </div>

      <div>
        <span
          style={
            styles.summaryLabel
          }
        >
          Stock global
        </span>

        <strong>
          {Number(
            variant.stock || 0
          )}
        </strong>
      </div>
    </div>
  )
}

const styles = {
  header: {
    display: 'flex',
    justifyContent:
      'space-between',
    alignItems: 'flex-start',
    gap: 14,
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

  grid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(310px, 1fr))',
    gap: 16,
    marginBottom: 16,
  },

  card: {
    display: 'grid',
    gap: 14,
    padding: 16,
    border:
      '1px solid #e6ded2',
    borderRadius: 22,
    background: '#fff',
    marginBottom: 16,
  },

  cardHeader: {
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
    lineHeight: 1.5,
  },

  field: {
    display: 'grid',
    gap: 6,
  },

  label: {
    fontSize: 12,
    fontWeight: 900,
    color: '#6f665c',
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
    minHeight: 82,
    padding: 12,
    border:
      '1px solid #e6ded2',
    borderRadius: 14,
    background: '#fff',
    color: '#1f1a14',
    resize: 'vertical',
    boxSizing:
      'border-box',
  },

  button: {
    minHeight: 44,
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

  summary: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(3, minmax(0, 1fr))',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    background: '#f7f3ed',
  },

  summaryLabel: {
    display: 'block',
    marginBottom: 4,
    color: '#8a7f72',
    fontSize: 10,
    fontWeight: 900,
    textTransform:
      'uppercase',
  },

  tableWrap: {
    overflowX: 'auto',
  },

  table: {
    width: '100%',
    minWidth: 1100,
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

  muted: {
    color: '#8a7f72',
    fontSize: 11,
  },

  positive: {
    color: '#2e7d32',
    fontWeight: 900,
  },

  negative: {
    color: '#c0392b',
    fontWeight: 900,
  },

  empty: {
    padding: 24,
    textAlign: 'center',
    color: '#8a7f72',
  },
}