'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminShell from '../components/AdminShell'
import { useAdminI18n } from '../i18n/AdminI18nProvider'
import { getAdminUser } from '../lib/adminAuth'
import { adminApi } from '../lib/adminApi'

const emptyForm = {
  name: '',
  slug: '',
  reference: '',
  marque: '',
  rubrique: '',
  categorie: '',
  famille: '',
  description: '',
  featuresText: '',
  specsText: '',
  url_image1: '',
  url_image2: '',
  url_image3: '',
  url_image4: '',
  url_image5: '',
  price: '',
  sale_price: '',
  discount_percent: 0,
  colorsText: '',
  sizesText: '',
  stock: 0,
  weight: '',
  badge: '',
  is_active: true,
  is_featured: false,
  is_new: false,
  is_bestseller: false,
  rating: 0,
  reviews_count: 0,
  category_id: '',
  subcategory_id: '',
  roomTagsText: '',
  materialTagsText: '',
  styleTagsText: '',
  dimensionsText: '',
  care_instructions: '',
  origin_country: '',
  collection_name: '',
  seo_title: '',
  seo_description: '',
  price_wholesale: 0,
  wholesale_min_qty: 1,
}

export default function AdminProducts() {
  const { t } = useAdminI18n()
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
        const data = await adminApi.get('/products?include_inactive=true&page_size=20')
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

  function toJsonText(value, fallback) {
    if (value === null || value === undefined) return fallback

    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return fallback
    }
  }

  function toTextList(value) {
    return Array.isArray(value) ? value.join(', ') : ''
  }

  function productToForm(product) {
    return {
      name: product.name || '',
      slug: product.slug || '',
      reference: product.reference || '',
      marque: product.marque || '',
      rubrique: product.rubrique || '',
      categorie: product.categorie || '',
      famille: product.famille || '',
      description: product.description || '',
      featuresText: toJsonText(product.features, '[]'),
      specsText: toJsonText(product.specs, '{}'),
      url_image1: product.url_image1 || '',
      url_image2: product.url_image2 || '',
      url_image3: product.url_image3 || '',
      url_image4: product.url_image4 || '',
      url_image5: product.url_image5 || '',
      price: product.price || '',
      sale_price: product.sale_price || '',
      discount_percent: product.discount_percent || 0,
      colorsText: toTextList(product.colors),
      sizesText: toTextList(product.sizes),
      stock: product.stock || 0,
      weight: product.weight || '',
      badge: product.badge || '',
      is_active: Boolean(product.is_active),
      is_featured: Boolean(product.is_featured),
      is_new: Boolean(product.is_new),
      is_bestseller: Boolean(product.is_bestseller),
      rating: product.rating || 0,
      reviews_count: product.reviews_count || 0,
      category_id: product.category_id || '',
      subcategory_id: product.subcategory_id || '',
      roomTagsText: toTextList(product.room_tags),
      materialTagsText: toTextList(product.material_tags),
      styleTagsText: toTextList(product.style_tags),
      dimensionsText: toJsonText(product.dimensions, '{}'),
      care_instructions: product.care_instructions || '',
      origin_country: product.origin_country || '',
      collection_name: product.collection_name || '',
      seo_title: product.seo_title || '',
      seo_description: product.seo_description || '',
      price_wholesale: product.price_wholesale || 0,
      wholesale_min_qty: product.wholesale_min_qty || 1,
    }
  }

  function textToArray(value) {
    return String(value || '')
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  }

  function parseJson(value, fallback) {
    if (!String(value || '').trim()) return fallback

    try {
      return JSON.parse(value)
    } catch {
      throw new Error(t('products.invalidJson'))
    }
  }

  function formToPayload() {
    return {
      name: form.name.trim(),
      slug: form.slug.trim(),
      reference: form.reference.trim(),
      marque: form.marque.trim() || null,
      rubrique: form.rubrique.trim() || null,
      categorie: form.categorie.trim() || null,
      famille: form.famille.trim() || null,
      description: form.description.trim() || null,
      features: parseJson(form.featuresText, []),
      specs: parseJson(form.specsText, {}),
      url_image1: form.url_image1.trim() || null,
      url_image2: form.url_image2.trim() || null,
      url_image3: form.url_image3.trim() || null,
      url_image4: form.url_image4.trim() || null,
      url_image5: form.url_image5.trim() || null,
      price: Number(form.price || 0),
      sale_price: form.sale_price !== '' ? Number(form.sale_price) : null,
      discount_percent: Number(form.discount_percent || 0),
      colors: textToArray(form.colorsText),
      sizes: textToArray(form.sizesText),
      stock: Number(form.stock || 0),
      weight: form.weight !== '' ? Number(form.weight) : null,
      badge: form.badge.trim() || null,
      is_active: Boolean(form.is_active),
      is_featured: Boolean(form.is_featured),
      is_new: Boolean(form.is_new),
      is_bestseller: Boolean(form.is_bestseller),
      rating: Number(form.rating || 0),
      reviews_count: Number(form.reviews_count || 0),
      category_id: form.category_id ? Number(form.category_id) : null,
      subcategory_id: form.subcategory_id ? Number(form.subcategory_id) : null,
      room_tags: textToArray(form.roomTagsText),
      material_tags: textToArray(form.materialTagsText),
      style_tags: textToArray(form.styleTagsText),
      dimensions: parseJson(form.dimensionsText, {}),
      care_instructions: form.care_instructions.trim() || null,
      origin_country: form.origin_country.trim() || null,
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
            <TextField label={t('products.name')} value={form.name} onChange={value => updateForm('name', value)} required />
            <TextField label={t('products.slug')} value={form.slug} onChange={value => updateForm('slug', value)} required />
            <TextField label={t('products.reference')} value={form.reference} onChange={value => updateForm('reference', value)} required />
            <TextField label={t('products.brand')} value={form.marque} onChange={value => updateForm('marque', value)} />

            <SelectOrText label={t('products.section')} value={form.rubrique} options={options.rubriques} onChange={value => updateForm('rubrique', value)} />
            <SelectOrText label={t('products.category')} value={form.categorie} options={options.categories} onChange={value => updateForm('categorie', value)} />
            <SelectOrText label={t('products.family')} value={form.famille} options={options.familles} onChange={value => updateForm('famille', value)} />
            <SelectOrText label={t('products.badge')} value={form.badge} options={options.badges} onChange={value => updateForm('badge', value)} />

            <NumberField label={t('products.retailPrice')} value={form.price} onChange={value => updateForm('price', value)} required />
            <NumberField label={t('products.salePrice')} value={form.sale_price} onChange={value => updateForm('sale_price', value)} />
            <NumberField label={t('products.discountPercent')} value={form.discount_percent} onChange={value => updateForm('discount_percent', value)} />
            <NumberField label={t('products.wholesalePrice')} value={form.price_wholesale} onChange={value => updateForm('price_wholesale', value)} />
            <NumberField label={t('products.wholesaleMinQty')} value={form.wholesale_min_qty} onChange={value => updateForm('wholesale_min_qty', value)} />
            <NumberField label={t('products.globalStock')} value={form.stock} onChange={value => updateForm('stock', value)} />
            <NumberField label={t('products.weight')} value={form.weight} onChange={value => updateForm('weight', value)} />
            <NumberField label={t('products.rating')} value={form.rating} onChange={value => updateForm('rating', value)} />
            <NumberField label={t('products.reviewsCount')} value={form.reviews_count} onChange={value => updateForm('reviews_count', value)} />

            <BooleanField label={t('products.status')} value={form.is_active} onChange={value => updateForm('is_active', value)} trueLabel={t('products.active')} falseLabel={t('products.inactive')} />
            <BooleanField label={t('products.featured')} value={form.is_featured} onChange={value => updateForm('is_featured', value)} />
            <BooleanField label={t('products.new')} value={form.is_new} onChange={value => updateForm('is_new', value)} />
            <BooleanField label={t('products.bestseller')} value={form.is_bestseller} onChange={value => updateForm('is_bestseller', value)} />

            <TextField label={t('products.categoryId')} value={form.category_id} onChange={value => updateForm('category_id', value)} />
            <TextField label={t('products.subcategoryId')} value={form.subcategory_id} onChange={value => updateForm('subcategory_id', value)} />
            <TextField label={t('products.originCountry')} value={form.origin_country} onChange={value => updateForm('origin_country', value)} />
            <TextField label={t('products.collectionName')} value={form.collection_name} onChange={value => updateForm('collection_name', value)} />
          </div>

          <div style={styles.imageGrid}>
            {[1, 2, 3, 4, 5].map(index => {
              const field = `url_image${index}`

              return (
                <label key={field} style={styles.field}>
                  <span style={styles.label}>{t('products.image')} {index}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={event => uploadImage(event, field)}
                    style={styles.fileInput}
                  />
                  <input
                    value={form[field]}
                    onChange={event => updateForm(field, event.target.value)}
                    placeholder="/uploads/products/image.jpg"
                    style={styles.input}
                  />
                </label>
              )
            })}
          </div>

          <TextArea label={t('products.description')} value={form.description} onChange={value => updateForm('description', value)} />
          <TextArea label={t('products.featuresJson')} value={form.featuresText} onChange={value => updateForm('featuresText', value)} />
          <TextArea label={t('products.specsJson')} value={form.specsText} onChange={value => updateForm('specsText', value)} />
          <TextArea label={t('products.colors')} value={form.colorsText} onChange={value => updateForm('colorsText', value)} />
          <TextArea label={t('products.sizes')} value={form.sizesText} onChange={value => updateForm('sizesText', value)} />
          <TextArea label={t('products.roomTags')} value={form.roomTagsText} onChange={value => updateForm('roomTagsText', value)} />
          <TextArea label={t('products.materialTags')} value={form.materialTagsText} onChange={value => updateForm('materialTagsText', value)} />
          <TextArea label={t('products.styleTags')} value={form.styleTagsText} onChange={value => updateForm('styleTagsText', value)} />
          <TextArea label={t('products.dimensionsJson')} value={form.dimensionsText} onChange={value => updateForm('dimensionsText', value)} />
          <TextArea label={t('products.careInstructions')} value={form.care_instructions} onChange={value => updateForm('care_instructions', value)} />
          <TextArea label={t('products.seoTitle')} value={form.seo_title} onChange={value => updateForm('seo_title', value)} />
          <TextArea label={t('products.seoDescription')} value={form.seo_description} onChange={value => updateForm('seo_description', value)} />

          <div style={styles.actions}>
            <button type="button" onClick={() => setFormOpen(false)} style={styles.ghostButton}>
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
                          <button type="button" onClick={() => openEdit(product)} style={styles.smallButton}>
                            {t('common.edit')}
                          </button>
                          <button type="button" onClick={() => deleteProduct(product)} style={styles.dangerButton}>
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
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <input
        list={`list-${label}`}
        value={value}
        onChange={event => onChange(event.target.value)}
        style={styles.input}
      />
      <datalist id={`list-${label}`}>
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
  },
  fileInput: {
    width: '100%',
    border: '1px dashed #d8cfc3',
    borderRadius: 14,
    background: '#f7f3ed',
    color: '#1f1a14',
    padding: 10,
    fontSize: 12,
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