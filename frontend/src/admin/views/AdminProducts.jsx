'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminShell from '../components/AdminShell'
import { useAdminI18n } from '../i18n/AdminI18nProvider'
import { getAdminUser } from '../lib/adminAuth'
import { adminApi } from '../lib/adminApi'

const emptyForm = {
  name: '',
  marque: '',
  rubrique: '',
  categorie: '',
  famille: '',
  description: '',
  url_image1: '',
  url_image2: '',
  url_image3: '',
  url_image4: '',
  url_image5: '',
  price: '',
  colors: [],
height: '',
width: '',
depth: '',
  stock: 0,
  weight: '',
  badge: '',
  is_active: true,
  is_available_on_site: true,
  care_instructions: '',
  origin_country: '',
  collection_name: '',
  seo_title: '',
  seo_description: '',
  price_wholesale: 0,
  wholesale_min_qty: 1,
}

const COUNTRY_CODES = [
  'MA', 'FR', 'ES', 'IT', 'PT', 'DE', 'BE', 'NL', 'GB', 'US', 'CA', 'CN',
  'TR', 'AE', 'SA', 'EG', 'TN', 'DZ', 'SN', 'CI', 'NG', 'ZA', 'IN', 'JP',
  'KR', 'ID', 'VN', 'TH', 'MY', 'SG', 'BR', 'MX', 'AR', 'AU',
]

const COLOR_OPTIONS = [
  'Blanc',
  'Noir',
  'Gris',
  'Argenté',
  'Doré',
  'Bronze',
  'Cuivre',
  'Transparent',
  'Cristal',
  'Beige',
  'Marron',
  'Bois clair',
  'Bois foncé',
  'Rouge',
  'Bordeaux',
  'Rose',
  'Violet',
  'Bleu',
  'Bleu marine',
  'Turquoise',
  'Vert',
  'Vert olive',
  'Jaune',
  'Orange',
  'Multicolore',
]

export default function AdminProducts() {
  const { t, locale } = useAdminI18n()
  const [user, setUser] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const isAdmin = user?.role === 'admin'

  const options = useMemo(() => {
    function unique(field) {
      return [...new Set(products.map(product => product[field]).filter(Boolean))]
        .sort((a, b) => String(a).localeCompare(String(b)))
    }

    return {
      rubriques: unique('rubrique'),
      categories: unique('categorie'),
      familles: unique('famille'),
      badges: unique('badge'),
    }
  }, [products])

  const countryOptions = useMemo(() => {
    const safeLocale = locale || 'fr'

    const displayNames =
      typeof Intl !== 'undefined' && Intl.DisplayNames
        ? new Intl.DisplayNames([safeLocale], { type: 'region' })
        : null

    return COUNTRY_CODES.map(code => ({
      value: code,
      label: displayNames?.of(code) || code,
    })).sort((a, b) => a.label.localeCompare(b.label))
  }, [locale])

  async function load() {
    setLoading(true)
    setError('')

    try {
      const currentUser = getAdminUser()
      setUser(currentUser)

      if (currentUser?.role === 'point_of_sale') {
        const data = await adminApi.get('/point-of-sale/products')

        setProducts(
          Array.isArray(data)
            ? data.map(row => ({
                ...row.products,
                pos_quantity: row.quantity,
              }))
            : [],
        )
      } else {
        const data = await adminApi.get(
          '/products?include_inactive=true&include_unavailable_on_site=true&page_size=20',
        )
        setProducts(Array.isArray(data?.items) ? data.items : [])
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

  function productToForm(product) {
    return {
      name: product.name || '',
      marque: product.marque || '',
      rubrique: product.rubrique || '',
      categorie: product.categorie || '',
      famille: product.famille || '',
      description: product.description || '',
      url_image1: product.url_image1 || '',
      url_image2: product.url_image2 || '',
      url_image3: product.url_image3 || '',
      url_image4: product.url_image4 || '',
      url_image5: product.url_image5 || '',
      price: product.price || '',
      colors: Array.isArray(product.colors) ? product.colors : [],
height: Array.isArray(product.sizes) ? product.sizes[0] || '' : '',
width: Array.isArray(product.sizes) ? product.sizes[1] || '' : '',
depth: Array.isArray(product.sizes) ? product.sizes[2] || '' : '',
      stock: product.stock || 0,
      weight: product.weight || '',
      badge: product.badge || '',
      is_active: Boolean(product.is_active),
      is_available_on_site:
        product.is_available_on_site !== undefined
          ? Boolean(product.is_available_on_site)
          : true,
      care_instructions: product.care_instructions || '',
      origin_country: product.origin_country || '',
      collection_name: product.collection_name || '',
      seo_title: product.seo_title || '',
      seo_description: product.seo_description || '',
      price_wholesale: product.price_wholesale || 0,
      wholesale_min_qty: product.wholesale_min_qty || 1,
    }
  }

  function formToPayload() {
    return {
      name: form.name.trim(),
      marque: form.marque.trim() || null,
      rubrique: form.rubrique.trim() || null,
      categorie: form.categorie.trim() || null,
      famille: form.famille.trim() || null,
      description: form.description.trim() || null,

      url_image1: form.url_image1 || null,
      url_image2: form.url_image2 || null,
      url_image3: form.url_image3 || null,
      url_image4: form.url_image4 || null,
      url_image5: form.url_image5 || null,

      price: Number(form.price || 0),
      colors: Array.isArray(form.colors) ? form.colors : [],
sizes: [form.height, form.width, form.depth]
  .map(value => String(value || '').trim())
  .filter(Boolean),

      stock: Number(form.stock || 0),
      weight: form.weight !== '' ? Number(form.weight) : null,

      badge: form.badge.trim() || null,

      is_active: Boolean(form.is_active),
      is_available_on_site: Boolean(form.is_available_on_site),

      care_instructions: form.care_instructions.trim() || null,
      origin_country: form.origin_country || null,
      collection_name: form.collection_name.trim() || null,

      seo_title: form.seo_title.trim() || null,
      seo_description: form.seo_description.trim() || null,

      price_wholesale: Number(form.price_wholesale || 0),
      wholesale_min_qty: Number(form.wholesale_min_qty || 1),
    }
  }

  function updateForm(name, value) {
    setForm(current => ({
      ...current,
      [name]: value,
    }))
  }

  function openCreate() {
    setEditingProduct(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  function openEdit(product) {
    setEditingProduct(product)
    setForm(productToForm(product))
    setFormOpen(true)
  }

  async function saveProduct(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload = formToPayload()

      if (editingProduct) {
        await adminApi.put(`/products/${editingProduct.id}`, payload)
      } else {
        await adminApi.post('/products', payload)
      }

      setFormOpen(false)
      setEditingProduct(null)
      setForm(emptyForm)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteProduct(product) {
    const confirmed = window.confirm(t('products.confirmDelete'))

    if (!confirmed) return

    setSaving(true)
    setError('')

    try {
      await adminApi.del(`/products/${product.id}`)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function uploadImage(event, field) {
    const file = event.target.files?.[0]

    if (!file) return

    const data = new FormData()
    data.append('file', file)

    setSaving(true)
    setError('')

    try {
      const result = await adminApi.upload('/products/upload-image', data)
      updateForm(field, result.url)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
      event.target.value = ''
    }
  }

  return (
    <AdminShell>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{t('products.title')}</h1>
          <p style={styles.subtitle}>
            {isAdmin ? t('products.subtitleAdmin') : t('products.subtitlePos')}
          </p>
        </div>

        {isAdmin && (
          <button type="button" onClick={openCreate} style={styles.primaryButton}>
            {t('products.create')}
          </button>
        )}
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {isAdmin && formOpen && (
        <form onSubmit={saveProduct} style={styles.formCard}>
          <div style={styles.formHeader}>
            <strong>
              {editingProduct ? t('products.editProduct') : t('products.newProduct')}
            </strong>

            <button
              type="button"
              onClick={() => setFormOpen(false)}
              style={styles.ghostButton}
            >
              {t('common.cancel')}
            </button>
          </div>

          <div style={styles.formGrid}>
            <TextField
              label={t('products.name')}
              value={form.name}
              onChange={value => updateForm('name', value)}
              required
            />

            <TextField
              label={t('products.brand')}
              value={form.marque}
              onChange={value => updateForm('marque', value)}
            />

            <SelectOrText
              label={t('products.section')}
              value={form.rubrique}
              options={options.rubriques}
              onChange={value => updateForm('rubrique', value)}
            />

            <SelectOrText
              label={t('products.category')}
              value={form.categorie}
              options={options.categories}
              onChange={value => updateForm('categorie', value)}
            />

            <SelectOrText
              label={t('products.family')}
              value={form.famille}
              options={options.familles}
              onChange={value => updateForm('famille', value)}
            />

            <TextField
              label={t('products.collectionName')}
              value={form.collection_name}
              onChange={value => updateForm('collection_name', value)}
            />

            <SelectOrText
              label={t('products.badge')}
              value={form.badge}
              options={options.badges}
              onChange={value => updateForm('badge', value)}
            />

            <NumberField
              label={t('products.retailPrice')}
              value={form.price}
              onChange={value => updateForm('price', value)}
              required
            />

            <NumberField
              label={t('products.wholesalePrice')}
              value={form.price_wholesale}
              onChange={value => updateForm('price_wholesale', value)}
            />

            <NumberField
              label={t('products.wholesaleMinQty')}
              value={form.wholesale_min_qty}
              onChange={value => updateForm('wholesale_min_qty', value)}
            />

            <NumberField
              label={t('products.globalStock')}
              value={form.stock}
              onChange={value => updateForm('stock', value)}
            />

            <NumberField
              label={t('products.weightGrams')}
              value={form.weight}
              onChange={value => updateForm('weight', value)}
            />

            <BooleanField
              label={t('products.status')}
              value={form.is_active}
              onChange={value => updateForm('is_active', value)}
              trueLabel={t('products.active')}
              falseLabel={t('products.inactive')}
            />

            <BooleanField
              label={t('products.availableOnSite')}
              value={form.is_available_on_site}
              onChange={value => updateForm('is_available_on_site', value)}
            />

            <SelectField
              label={t('products.originCountry')}
              value={form.origin_country}
              options={countryOptions}
              onChange={value => updateForm('origin_country', value)}
              placeholder={t('products.chooseCountry')}
            />


          </div>

          <div style={styles.imageGrid}>
            {[1, 2, 3, 4, 5].map(index => {
              const field = `url_image${index}`

              return (
                <label key={field} style={styles.field}>
                  <span style={styles.label}>
                    {t('products.image')} {index}
                  </span>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={event => uploadImage(event, field)}
                    style={styles.fileInput}
                  />

                  {form[field] && (
                    <span style={styles.uploadedText}>
                      {t('products.uploadedImage')}
                    </span>
                  )}
                </label>
              )
            })}
          </div>

          <MultiSelectField
            label={t('products.colors')}
            value={form.colors}
            options={COLOR_OPTIONS}
            onChange={value => updateForm('colors', value)}
          />

<div style={styles.formGrid}>
  <TextField
    label={t('products.height')}
    value={form.height}
    onChange={value => updateForm('height', value)}
  />

  <TextField
    label={t('products.width')}
    value={form.width}
    onChange={value => updateForm('width', value)}
  />

  <TextField
    label={t('products.depth')}
    value={form.depth}
    onChange={value => updateForm('depth', value)}
  />
</div>

          <TextArea
            label={t('products.description')}
            value={form.description}
            onChange={value => updateForm('description', value)}
          />

          <TextArea
            label={t('products.careInstructions')}
            value={form.care_instructions}
            onChange={value => updateForm('care_instructions', value)}
          />

          <TextArea
            label={t('products.seoTitle')}
            value={form.seo_title}
            onChange={value => updateForm('seo_title', value)}
          />

          <TextArea
            label={t('products.seoDescription')}
            value={form.seo_description}
            onChange={value => updateForm('seo_description', value)}
          />

          <div style={styles.actions}>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              style={styles.ghostButton}
            >
              {t('common.cancel')}
            </button>

            <button type="submit" disabled={saving} style={styles.primaryButton}>
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      )}

      <div style={styles.card}>
        {loading ? (
          <div style={styles.empty}>{t('common.loading')}</div>
        ) : products.length === 0 ? (
          <div style={styles.empty}>{t('common.empty')}</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>{t('products.product')}</th>
                  <th style={styles.th}>{t('products.category')}</th>
                  <th style={styles.th}>{t('products.retailPrice')}</th>
                  <th style={styles.th}>{t('products.wholesalePrice')}</th>
                  <th style={styles.th}>
                    {isAdmin ? t('products.globalStock') : t('products.posStock')}
                  </th>
                  <th style={styles.th}>{t('products.status')}</th>
                  {isAdmin && <th style={styles.th}>{t('products.actions')}</th>}
                </tr>
              </thead>

              <tbody>
                {products.map(product => (
                  <tr key={product.id}>
                    <td style={styles.td}>
                      <strong>{product.name}</strong>
                      <br />
                      <span style={styles.muted}>{product.reference}</span>
                    </td>

                    <td style={styles.td}>
                      {product.categorie || product.rubrique || '-'}
                    </td>

                    <td style={styles.td}>
                      {Number(product.price || 0).toFixed(2)} DH
                    </td>

                    <td style={styles.td}>
                      {Number(product.price_wholesale || 0).toFixed(2)} DH
                    </td>

                    <td style={styles.td}>
                      {isAdmin
                        ? Number(product.stock || 0)
                        : Number(product.pos_quantity || 0)}
                    </td>

                    <td style={styles.td}>
                      {product.is_active ? t('products.active') : t('products.inactive')}
                    </td>

                    {isAdmin && (
                      <td style={styles.td}>
                        <div style={styles.rowActions}>
                          <button
                            type="button"
                            onClick={() => openEdit(product)}
                            style={styles.smallButton}
                          >
                            {t('common.edit')}
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteProduct(product)}
                            style={styles.dangerButton}
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      </td>
                    )}
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

function SelectField({ label, value, options, onChange, placeholder }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>

      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        style={styles.input}
      >
        <option value="">{placeholder}</option>

        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function MultiSelectField({ label, value, options, onChange }) {
  function toggle(option) {
    const current = Array.isArray(value) ? value : []

    if (current.includes(option)) {
      onChange(current.filter(item => item !== option))
      return
    }

    onChange([...current, option])
  }

  return (
    <div style={styles.fieldWide}>
      <span style={styles.label}>{label}</span>

      <div style={styles.choiceGrid}>
        {options.map(option => (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            style={{
              ...styles.choiceButton,
              ...(Array.isArray(value) && value.includes(option)
                ? styles.choiceButtonActive
                : {}),
            }}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

function TextField({ label, value, onChange, required }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>

      <input
        value={value}
        required={required}
        onChange={event => onChange(event.target.value)}
        style={styles.input}
      />
    </label>
  )
}

function NumberField({ label, value, onChange, required }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>

      <input
        type="number"
        step="any"
        value={value}
        required={required}
        onChange={event => onChange(event.target.value)}
        style={styles.input}
      />
    </label>
  )
}

function TextArea({ label, value, onChange }) {
  return (
    <label style={styles.fieldWide}>
      <span style={styles.label}>{label}</span>

      <textarea
        value={value}
        onChange={event => onChange(event.target.value)}
        style={styles.textarea}
      />
    </label>
  )
}

function BooleanField({ label, value, onChange, trueLabel = 'Oui', falseLabel = 'Non' }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>

      <select
        value={value ? 'true' : 'false'}
        onChange={event => onChange(event.target.value === 'true')}
        style={styles.input}
      >
        <option value="true">{trueLabel}</option>
        <option value="false">{falseLabel}</option>
      </select>
    </label>
  )
}

function SelectOrText({ label, value, options, onChange }) {
  const listId = `list-${String(label).replace(/\s+/g, '-').toLowerCase()}`

  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>

      <input
        list={listId}
        value={value}
        onChange={event => onChange(event.target.value)}
        style={styles.input}
      />

      <datalist id={listId}>
        {options.map(option => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </label>
  )
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 14,
    alignItems: 'flex-start',
    marginBottom: 18,
    flexWrap: 'wrap',
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
  primaryButton: {
    border: 'none',
    borderRadius: 999,
    background: '#1f1a14',
    color: '#fff',
    padding: '11px 16px',
    fontSize: 13,
    fontWeight: 900,
    cursor: 'pointer',
  },
  ghostButton: {
    border: '1px solid #e6ded2',
    borderRadius: 999,
    background: '#fff',
    color: '#1f1a14',
    padding: '10px 14px',
    fontSize: 13,
    fontWeight: 900,
    cursor: 'pointer',
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
  formCard: {
    background: '#fff',
    border: '1px solid #e6ded2',
    borderRadius: 22,
    padding: 14,
    marginBottom: 14,
    display: 'grid',
    gap: 12,
  },
  formHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: 10,
  },
  imageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 10,
  },
  field: {
    display: 'grid',
    gap: 6,
  },
  fieldWide: {
    display: 'grid',
    gap: 6,
  },
  label: {
    fontSize: 12,
    color: '#8a7f72',
    fontWeight: 900,
  },
  input: {
    width: '100%',
    minHeight: 42,
    border: '1px solid #e6ded2',
    borderRadius: 14,
    background: '#fff',
    color: '#1f1a14',
    padding: '0 12px',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  },
  fileInput: {
    width: '100%',
    border: '1px dashed #d8cfc3',
    borderRadius: 14,
    background: '#f7f3ed',
    color: '#1f1a14',
    padding: 10,
    fontSize: 12,
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    minHeight: 90,
    border: '1px solid #e6ded2',
    borderRadius: 14,
    background: '#fff',
    color: '#1f1a14',
    padding: 12,
    fontSize: 13,
    outline: 'none',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  infoBox: {
    border: '1px solid #e6ded2',
    borderRadius: 14,
    background: '#f7f3ed',
    color: '#8a7f72',
    padding: '11px 12px',
    fontSize: 12,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    minHeight: 42,
    boxSizing: 'border-box',
  },
  uploadedText: {
    color: '#2e7d32',
    fontSize: 12,
    fontWeight: 900,
  },
  choiceGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceButton: {
    border: '1px solid #e6ded2',
    borderRadius: 999,
    background: '#fff',
    color: '#1f1a14',
    padding: '9px 12px',
    fontSize: 12,
    fontWeight: 900,
    cursor: 'pointer',
  },
  choiceButtonActive: {
    background: '#1f1a14',
    color: '#fff',
    borderColor: '#1f1a14',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    flexWrap: 'wrap',
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
  muted: {
    color: '#8a7f72',
    fontSize: 12,
  },
  rowActions: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  smallButton: {
    border: '1px solid #e6ded2',
    borderRadius: 999,
    background: '#fff',
    color: '#1f1a14',
    padding: '8px 11px',
    fontSize: 12,
    fontWeight: 900,
    cursor: 'pointer',
  },
  dangerButton: {
    border: '1px solid #ffd0d0',
    borderRadius: 999,
    background: '#fff0f0',
    color: '#c0392b',
    padding: '8px 11px',
    fontSize: 12,
    fontWeight: 900,
    cursor: 'pointer',
  },
  empty: {
    padding: 24,
    color: '#8a7f72',
    textAlign: 'center',
  },
}