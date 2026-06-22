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

const PRODUCT_RUBRIQUE_OPTIONS = [
  {
    value: 'Mobilier',
    label: 'Mobilier',
  },
  {
    value: 'Luminaires',
    label: 'Luminaires',
  },
  {
    value: 'Décoration',
    label: 'Décoration',
  },
  {
    value: 'Art mural',
    label: 'Art mural',
  },
  {
    value: 'Fleurs & Arrangements',
    label: 'Fleurs & Arrangements',
  },
  {
    value: 'Arts de la table',
    label: 'Arts de la table',
  },
]

const COUNTRY_CODES = [
  'MA',
  'FR',
  'ES',
  'IT',
  'PT',
  'DE',
  'BE',
  'NL',
  'GB',
  'US',
  'CA',
  'CN',
  'TR',
  'AE',
  'SA',
  'EG',
  'TN',
  'DZ',
  'SN',
  'CI',
  'NG',
  'ZA',
  'IN',
  'JP',
  'KR',
  'ID',
  'VN',
  'TH',
  'MY',
  'SG',
  'BR',
  'MX',
  'AR',
  'AU',
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
  price_wholesale: 0,
  wholesale_min_qty: 1,

  stock: 0,
  weight: '',

  width_cm: '',
  depth_cm: '',
  height_cm: '',

  has_color_variants: false,
  colors: [],

  badge: '',
  is_active: true,
  is_available_on_site: true,
  is_bestseller: false,

  care_instructions: '',
  origin_country: '',
  collection_name: '',
  seo_title: '',
  seo_description: '',
}

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value
  }

  if (!value) {
    return []
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)

      return Array.isArray(parsed)
        ? parsed
        : []
    } catch {
      return value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
    }
  }

  return []
}

function nullableNumber(value) {
  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {
    return null
  }

  const number = Number(value)

  return Number.isFinite(number)
    ? number
    : null
}

export default function AdminProducts() {
  const { t, locale } = useAdminI18n()

  const [user, setUser] =
    useState(null)

  const [products, setProducts] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState('')

  const [formOpen, setFormOpen] =
    useState(false)

  const [
    editingProduct,
    setEditingProduct,
  ] = useState(null)

  const [form, setForm] =
    useState(emptyForm)

  const isAdmin =
    user?.role === 'admin'

  const options = useMemo(() => {
    function unique(field) {
      return [
        ...new Set(
          products
            .map(product => product[field])
            .filter(Boolean)
        ),
      ].sort((a, b) =>
        String(a).localeCompare(
          String(b)
        )
      )
    }

    return {
      categories:
        unique('categorie'),

      familles:
        unique('famille'),

      badges:
        unique('badge'),
    }
  }, [products])

  const countryOptions =
    useMemo(() => {
      const safeLocale =
        locale || 'fr'

      const displayNames =
        typeof Intl !== 'undefined' &&
        Intl.DisplayNames
          ? new Intl.DisplayNames(
              [safeLocale],
              {
                type: 'region',
              }
            )
          : null

      return COUNTRY_CODES.map(
        code => ({
          value: code,
          label:
            displayNames?.of(code) ||
            code,
        })
      ).sort((a, b) =>
        a.label.localeCompare(
          b.label
        )
      )
    }, [locale])

  async function load() {
    setLoading(true)
    setError('')

    try {
      const currentUser =
        getAdminUser()

      setUser(currentUser)

      if (
        currentUser?.role ===
        'point_of_sale'
      ) {
        const data =
          await adminApi.get(
            '/point-of-sale/products'
          )

        setProducts(
          Array.isArray(data)
            ? data.map(row => ({
                ...row.products,
                pos_quantity:
                  row.quantity,
              }))
            : []
        )

        return
      }

      const data =
        await adminApi.get(
          '/products?include_inactive=true&include_unavailable_on_site=true&page_size=20'
        )

      setProducts(
        Array.isArray(data?.items)
          ? data.items
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

  function productToForm(product) {
    const hasColorVariants =
      Boolean(
        product.has_color_variants
      )

    return {
      name:
        product.name || '',

      marque:
        product.marque || '',

      rubrique:
        product.rubrique || '',

      categorie:
        product.categorie || '',

      famille:
        product.famille || '',

      description:
        product.description || '',

      url_image1:
        product.url_image1 || '',

      url_image2:
        product.url_image2 || '',

      url_image3:
        product.url_image3 || '',

      url_image4:
        product.url_image4 || '',

      url_image5:
        product.url_image5 || '',

      price:
        product.price ?? '',

      price_wholesale:
        product.price_wholesale ??
        0,

      wholesale_min_qty:
        product.wholesale_min_qty ??
        1,

      stock:
        product.stock ?? 0,

      weight:
        product.weight ?? '',

      width_cm:
        product.width_cm ?? '',

      depth_cm:
        product.depth_cm ?? '',

      height_cm:
        product.height_cm ?? '',

      has_color_variants:
        hasColorVariants,

      colors:
        hasColorVariants
          ? normalizeArray(
              product.colors
            )
          : [],

      badge:
        product.badge || '',

      is_active:
        product.is_active !== false,

      is_available_on_site:
        product.is_available_on_site !==
        false,

      is_bestseller:
        Boolean(
          product.is_bestseller
        ),

      care_instructions:
        product.care_instructions ||
        '',

      origin_country:
        product.origin_country || '',

      collection_name:
        product.collection_name ||
        '',

      seo_title:
        product.seo_title || '',

      seo_description:
        product.seo_description ||
        '',
    }
  }

  function formToPayload() {
    const hasColorVariants =
      Boolean(
        form.has_color_variants
      )

    return {
      name:
        form.name.trim(),

      marque:
        form.marque.trim() ||
        null,

      rubrique:
        form.rubrique.trim() ||
        null,

      categorie:
        form.categorie.trim() ||
        null,

      famille:
        form.famille.trim() ||
        null,

      description:
        form.description.trim() ||
        null,

      url_image1:
        form.url_image1 || null,

      url_image2:
        form.url_image2 || null,

      url_image3:
        form.url_image3 || null,

      url_image4:
        form.url_image4 || null,

      url_image5:
        form.url_image5 || null,

      price:
        Number(form.price || 0),

      price_wholesale:
        Number(
          form.price_wholesale || 0
        ),

      wholesale_min_qty:
        Number(
          form.wholesale_min_qty ||
            1
        ),

      stock:
        Number(form.stock || 0),

      weight:
        nullableNumber(
          form.weight
        ),

      width_cm:
        nullableNumber(
          form.width_cm
        ),

      depth_cm:
        nullableNumber(
          form.depth_cm
        ),

      height_cm:
        nullableNumber(
          form.height_cm
        ),

      has_color_variants:
        hasColorVariants,

      colors:
        hasColorVariants
          ? normalizeArray(
              form.colors
            )
          : [],

      badge:
        form.badge.trim() ||
        null,

      is_active:
        Boolean(form.is_active),

      is_available_on_site:
        Boolean(
          form.is_available_on_site
        ),

      is_bestseller:
        Boolean(
          form.is_bestseller
        ),

      care_instructions:
        form.care_instructions.trim() ||
        null,

      origin_country:
        form.origin_country || null,

      collection_name:
        form.collection_name.trim() ||
        null,

      seo_title:
        form.seo_title.trim() ||
        null,

      seo_description:
        form.seo_description.trim() ||
        null,
    }
  }

  function updateForm(name, value) {
    setForm(current => {
      if (
        name ===
          'has_color_variants' &&
        value === false
      ) {
        return {
          ...current,
          has_color_variants:
            false,
          colors: [],
        }
      }

      return {
        ...current,
        [name]: value,
      }
    })
  }

  function openCreate() {
    setEditingProduct(null)

    setForm({
      ...emptyForm,
      colors: [],
    })

    setFormOpen(true)
  }

  function openEdit(product) {
    setEditingProduct(product)
    setForm(productToForm(product))
    setFormOpen(true)
  }

  function closeForm() {
    if (saving) {
      return
    }

    setFormOpen(false)
    setEditingProduct(null)

    setForm({
      ...emptyForm,
      colors: [],
    })
  }

  async function saveProduct(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload =
        formToPayload()

      if (editingProduct) {
        await adminApi.put(
          `/products/${editingProduct.id}`,
          payload
        )
      } else {
        await adminApi.post(
          '/products',
          payload
        )
      }

      setFormOpen(false)
      setEditingProduct(null)

      setForm({
        ...emptyForm,
        colors: [],
      })

      await load()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteProduct(
    product
  ) {
    const confirmed =
      window.confirm(
        t(
          'products.confirmDelete'
        )
      )

    if (!confirmed) {
      return
    }

    setSaving(true)
    setError('')

    try {
      await adminApi.del(
        `/products/${product.id}`
      )

      await load()
    } catch (deleteError) {
      setError(
        deleteError.message
      )
    } finally {
      setSaving(false)
    }
  }

  async function uploadImage(
    event,
    field
  ) {
    const file =
      event.target.files?.[0]

    if (!file) {
      return
    }

    const data = new FormData()
    data.append('file', file)

    setSaving(true)
    setError('')

    try {
      const result =
        await adminApi.upload(
          '/products/upload-image',
          data
        )

      updateForm(
        field,
        result.url
      )
    } catch (uploadError) {
      setError(
        uploadError.message
      )
    } finally {
      setSaving(false)
      event.target.value = ''
    }
  }

  return (
    <AdminShell>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            {t('products.title')}
          </h1>

          <p style={styles.subtitle}>
            {isAdmin
              ? t(
                  'products.subtitleAdmin'
                )
              : t(
                  'products.subtitlePos'
                )}
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={openCreate}
            style={
              styles.primaryButton
            }
          >
            {t('products.create')}
          </button>
        )}
      </div>

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      <div style={styles.card}>
        {loading ? (
          <div style={styles.empty}>
            {t('common.loading')}
          </div>
        ) : products.length === 0 ? (
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
                      'products.product'
                    )}
                  </th>

                  <th style={styles.th}>
                    {t(
                      'products.category'
                    )}
                  </th>

                  <th style={styles.th}>
                    {t(
                      'products.retailPrice'
                    )}
                  </th>

                  <th style={styles.th}>
                    {t(
                      'products.wholesalePrice'
                    )}
                  </th>

                  <th style={styles.th}>
                    {isAdmin
                      ? t(
                          'products.globalStock'
                        )
                      : t(
                          'products.posStock'
                        )}
                  </th>

                  <th style={styles.th}>
                    {t(
                      'products.status'
                    )}
                  </th>

                  {isAdmin && (
                    <th
                      style={styles.th}
                    >
                      {t(
                        'products.actions'
                      )}
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {products.map(
                  product => (
                    <tr
                      key={product.id}
                    >
                      <td
                        style={styles.td}
                      >
                        <strong>
                          {product.name}
                        </strong>

                        <br />

                        <span
                          style={
                            styles.muted
                          }
                        >
                          {
                            product.reference
                          }
                        </span>
                      </td>

                      <td
                        style={styles.td}
                      >
                        {product.categorie ||
                          product.rubrique ||
                          '-'}
                      </td>

                      <td
                        style={styles.td}
                      >
                        {Number(
                          product.price ||
                            0
                        ).toFixed(2)}{' '}
                        DH
                      </td>

                      <td
                        style={styles.td}
                      >
                        {Number(
                          product.price_wholesale ||
                            0
                        ).toFixed(2)}{' '}
                        DH
                      </td>

                      <td
                        style={styles.td}
                      >
                        {isAdmin
                          ? Number(
                              product.stock ||
                                0
                            )
                          : Number(
                              product.pos_quantity ||
                                0
                            )}
                      </td>

                      <td
                        style={styles.td}
                      >
                        {product.is_active
                          ? t(
                              'products.active'
                            )
                          : t(
                              'products.inactive'
                            )}
                      </td>

                      {isAdmin && (
                        <td
                          style={
                            styles.td
                          }
                        >
                          <div
                            style={
                              styles.rowActions
                            }
                          >
                            <button
                              type="button"
                              onClick={() =>
                                openEdit(
                                  product
                                )
                              }
                              style={
                                styles.smallButton
                              }
                            >
                              {t(
                                'common.edit'
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                deleteProduct(
                                  product
                                )
                              }
                              style={
                                styles.dangerButton
                              }
                            >
                              {t(
                                'common.delete'
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAdmin && formOpen && (
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
            aria-labelledby="product-form-title"
            style={styles.modalDialog}
          >
            <form
              onSubmit={saveProduct}
              style={styles.modalForm}
            >
              <div
                style={
                  styles.formHeader
                }
              >
                <strong
                  id="product-form-title"
                  style={
                    styles.modalTitle
                  }
                >
                  {editingProduct
                    ? t(
                        'products.editProduct'
                      )
                    : t(
                        'products.newProduct'
                      )}
                </strong>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  style={
                    styles.ghostButton
                  }
                >
                  {t('common.cancel')}
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
                <TextField
                  label={t(
                    'products.name'
                  )}
                  value={form.name}
                  onChange={value =>
                    updateForm(
                      'name',
                      value
                    )
                  }
                  required
                />

                <TextField
                  label={t(
                    'products.brand'
                  )}
                  value={form.marque}
                  onChange={value =>
                    updateForm(
                      'marque',
                      value
                    )
                  }
                />

                <SelectField
                  label={t(
                    'products.section'
                  )}
                  value={form.rubrique}
                  options={
                    PRODUCT_RUBRIQUE_OPTIONS
                  }
                  placeholder={t(
                    'products.selectSection'
                  )}
                  onChange={value =>
                    updateForm(
                      'rubrique',
                      value
                    )
                  }
                  required
                />

                <SelectOrText
                  label={t(
                    'products.category'
                  )}
                  value={
                    form.categorie
                  }
                  options={
                    options.categories
                  }
                  onChange={value =>
                    updateForm(
                      'categorie',
                      value
                    )
                  }
                />

                <SelectOrText
                  label={t(
                    'products.family'
                  )}
                  value={form.famille}
                  options={
                    options.familles
                  }
                  onChange={value =>
                    updateForm(
                      'famille',
                      value
                    )
                  }
                />

                <TextField
                  label={t(
                    'products.collectionName'
                  )}
                  value={
                    form.collection_name
                  }
                  onChange={value =>
                    updateForm(
                      'collection_name',
                      value
                    )
                  }
                />

                <SelectOrText
                  label={t(
                    'products.badge'
                  )}
                  value={form.badge}
                  options={
                    options.badges
                  }
                  onChange={value =>
                    updateForm(
                      'badge',
                      value
                    )
                  }
                />

                <NumberField
                  label={t(
                    'products.retailPrice'
                  )}
                  value={form.price}
                  onChange={value =>
                    updateForm(
                      'price',
                      value
                    )
                  }
                  required
                />

                <NumberField
                  label={t(
                    'products.wholesalePrice'
                  )}
                  value={
                    form.price_wholesale
                  }
                  onChange={value =>
                    updateForm(
                      'price_wholesale',
                      value
                    )
                  }
                />

                <NumberField
                  label={t(
                    'products.wholesaleMinQty'
                  )}
                  value={
                    form.wholesale_min_qty
                  }
                  onChange={value =>
                    updateForm(
                      'wholesale_min_qty',
                      value
                    )
                  }
                  min="1"
                />

                <NumberField
                  label={t(
                    'products.globalStock'
                  )}
                  value={form.stock}
                  onChange={value =>
                    updateForm(
                      'stock',
                      value
                    )
                  }
                  min="0"
                />

                <NumberField
                  label={t(
                    'products.weightGrams'
                  )}
                  value={form.weight}
                  onChange={value =>
                    updateForm(
                      'weight',
                      value
                    )
                  }
                  min="0"
                />

                <NumberField
                  label={t(
                    'products.width'
                  )}
                  value={
                    form.width_cm
                  }
                  onChange={value =>
                    updateForm(
                      'width_cm',
                      value
                    )
                  }
                  min="0"
                />

                <NumberField
                  label={t(
                    'products.depth'
                  )}
                  value={
                    form.depth_cm
                  }
                  onChange={value =>
                    updateForm(
                      'depth_cm',
                      value
                    )
                  }
                  min="0"
                />

                <NumberField
                  label={t(
                    'products.height'
                  )}
                  value={
                    form.height_cm
                  }
                  onChange={value =>
                    updateForm(
                      'height_cm',
                      value
                    )
                  }
                  min="0"
                />

                <BooleanField
                  label={t(
                    'products.status'
                  )}
                  value={
                    form.is_active
                  }
                  onChange={value =>
                    updateForm(
                      'is_active',
                      value
                    )
                  }
                  trueLabel={t(
                    'products.active'
                  )}
                  falseLabel={t(
                    'products.inactive'
                  )}
                />

                <BooleanField
                  label={t(
                    'products.availableOnSite'
                  )}
                  value={
                    form.is_available_on_site
                  }
                  onChange={value =>
                    updateForm(
                      'is_available_on_site',
                      value
                    )
                  }
                />

                <BooleanField
                  label={t(
                    'products.bestseller'
                  )}
                  value={
                    form.is_bestseller
                  }
                  onChange={value =>
                    updateForm(
                      'is_bestseller',
                      value
                    )
                  }
                />

                <BooleanField
                  label={t(
                    'products.hasColorVariants'
                  )}
                  value={
                    form.has_color_variants
                  }
                  onChange={value =>
                    updateForm(
                      'has_color_variants',
                      value
                    )
                  }
                />

                <SelectField
                  label={t(
                    'products.originCountry'
                  )}
                  value={
                    form.origin_country
                  }
                  options={
                    countryOptions
                  }
                  onChange={value =>
                    updateForm(
                      'origin_country',
                      value
                    )
                  }
                  placeholder={t(
                    'products.chooseCountry'
                  )}
                />
              </div>

              {form.has_color_variants && (
                <MultiSelectField
                  label={t(
                    'products.colors'
                  )}
                  value={form.colors}
                  options={
                    COLOR_OPTIONS
                  }
                  onChange={value =>
                    updateForm(
                      'colors',
                      value
                    )
                  }
                />
              )}

              <div
                style={styles.imageGrid}
              >
                {[1, 2, 3, 4, 5].map(
                  index => {
                    const field =
                      `url_image${index}`

                    return (
                      <label
                        key={field}
                        style={
                          styles.field
                        }
                      >
                        <span
                          style={
                            styles.label
                          }
                        >
                          {t(
                            'products.image'
                          )}{' '}
                          {index}
                        </span>

                        <input
                          type="file"
                          accept="image/*"
                          onChange={event =>
                            uploadImage(
                              event,
                              field
                            )
                          }
                          style={
                            styles.fileInput
                          }
                        />

                        {form[field] && (
                          <span
                            style={
                              styles.uploadedText
                            }
                          >
                            {t(
                              'products.uploadedImage'
                            )}
                          </span>
                        )}
                      </label>
                    )
                  }
                )}
              </div>

              <TextArea
                label={t(
                  'products.description'
                )}
                value={
                  form.description
                }
                onChange={value =>
                  updateForm(
                    'description',
                    value
                  )
                }
              />

              <TextArea
                label={t(
                  'products.careInstructions'
                )}
                value={
                  form.care_instructions
                }
                onChange={value =>
                  updateForm(
                    'care_instructions',
                    value
                  )
                }
              />

              <TextField
                wide
                label={t(
                  'products.seoTitle'
                )}
                value={form.seo_title}
                onChange={value =>
                  updateForm(
                    'seo_title',
                    value
                  )
                }
              />

              <TextArea
                label={t(
                  'products.seoDescription'
                )}
                value={
                  form.seo_description
                }
                onChange={value =>
                  updateForm(
                    'seo_description',
                    value
                  )
                }
              />

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
                    styles.ghostButton
                  }
                >
                  {t('common.cancel')}
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  style={
                    styles.primaryButton
                  }
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

function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder,
  required = false,
}) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>
        {label}
      </span>

      <select
        value={value}
        onChange={event =>
          onChange(
            event.target.value
          )
        }
        style={styles.input}
        required={required}
      >
        <option value="">
          {placeholder}
        </option>

        {options.map(option => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function MultiSelectField({
  label,
  value,
  options,
  onChange,
}) {
  function toggle(option) {
    const current =
      Array.isArray(value)
        ? value
        : []

    if (
      current.includes(option)
    ) {
      onChange(
        current.filter(
          item => item !== option
        )
      )

      return
    }

    onChange([
      ...current,
      option,
    ])
  }

  return (
    <div style={styles.fieldWide}>
      <span style={styles.label}>
        {label}
      </span>

      <div
        style={styles.choiceGrid}
      >
        {options.map(option => {
          const selected =
            Array.isArray(value) &&
            value.includes(option)

          return (
            <button
              key={option}
              type="button"
              onClick={() =>
                toggle(option)
              }
              style={{
                ...styles.choiceButton,
                ...(selected
                  ? styles.choiceButtonActive
                  : {}),
              }}
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  required = false,
  wide = false,
}) {
  return (
    <label
      style={
        wide
          ? styles.fieldWide
          : styles.field
      }
    >
      <span style={styles.label}>
        {label}
      </span>

      <input
        type="text"
        value={value}
        required={required}
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

function NumberField({
  label,
  value,
  onChange,
  required = false,
  min,
}) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>
        {label}
      </span>

      <input
        type="number"
        step="any"
        min={min}
        value={value}
        required={required}
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

function TextArea({
  label,
  value,
  onChange,
}) {
  return (
    <label
      style={styles.fieldWide}
    >
      <span style={styles.label}>
        {label}
      </span>

      <textarea
        value={value}
        onChange={event =>
          onChange(
            event.target.value
          )
        }
        style={styles.textarea}
      />
    </label>
  )
}

function BooleanField({
  label,
  value,
  onChange,
  trueLabel = 'Oui',
  falseLabel = 'Non',
}) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>
        {label}
      </span>

      <select
        value={
          value ? 'true' : 'false'
        }
        onChange={event =>
          onChange(
            event.target.value ===
              'true'
          )
        }
        style={styles.input}
      >
        <option value="true">
          {trueLabel}
        </option>

        <option value="false">
          {falseLabel}
        </option>
      </select>
    </label>
  )
}

function SelectOrText({
  label,
  value,
  options,
  onChange,
}) {
  const listId =
    `list-${String(label)
      .replace(/\s+/g, '-')
      .toLowerCase()}`

  return (
    <label style={styles.field}>
      <span style={styles.label}>
        {label}
      </span>

      <input
        type="text"
        list={listId}
        value={value}
        onChange={event =>
          onChange(
            event.target.value
          )
        }
        style={styles.input}
      />

      <datalist id={listId}>
        {options.map(option => (
          <option
            key={option}
            value={option}
          />
        ))}
      </datalist>
    </label>
  )
}

const styles = {
  header: {
    display: 'flex',
    justifyContent:
      'space-between',
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
    border:
      '1px solid #e6ded2',
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
    border:
      '1px solid #ffd0d0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    fontSize: 13,
  },

  card: {
    background: '#fff',
    border:
      '1px solid #e6ded2',
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
    border:
      '1px solid #e6ded2',
    borderRadius: 999,
    background: '#fff',
    color: '#1f1a14',
    padding: '8px 11px',
    fontSize: 12,
    fontWeight: 900,
    cursor: 'pointer',
  },

  dangerButton: {
    border:
      '1px solid #ffd0d0',
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
    width:
      'min(1180px, 100%)',
    maxHeight:
      'calc(100dvh - 32px)',
    overflow: 'hidden',
    borderRadius: 24,
    background: '#fff',
    border:
      '1px solid #e6ded2',
    boxShadow:
      '0 24px 80px rgba(31, 26, 20, 0.28)',
  },

  modalForm: {
    display: 'grid',
    gap: 16,
    maxHeight:
      'calc(100dvh - 32px)',
    overflowY: 'auto',
    padding: 18,
    boxSizing: 'border-box',
  },

  formHeader: {
    position: 'sticky',
    top: -18,
    zIndex: 5,
    display: 'flex',
    justifyContent:
      'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    margin: '-18px -18px 0',
    padding: 18,
    background: '#fff',
    borderBottom:
      '1px solid #eee6dc',
  },

  modalTitle: {
    fontSize: 20,
  },

  formGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(190px, 1fr))',
    gap: 12,
  },

  imageGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(210px, 1fr))',
    gap: 12,
  },

  field: {
    display: 'grid',
    gap: 6,
    minWidth: 0,
  },

  fieldWide: {
    display: 'grid',
    gap: 6,
    minWidth: 0,
  },

  label: {
    fontSize: 12,
    color: '#8a7f72',
    fontWeight: 900,
  },

  input: {
    width: '100%',
    minHeight: 44,
    border:
      '1px solid #e6ded2',
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
    border:
      '1px dashed #d8cfc3',
    borderRadius: 14,
    background: '#f7f3ed',
    color: '#1f1a14',
    padding: 10,
    fontSize: 12,
    boxSizing: 'border-box',
  },

  textarea: {
    width: '100%',
    minHeight: 100,
    border:
      '1px solid #e6ded2',
    borderRadius: 14,
    background: '#fff',
    color: '#1f1a14',
    padding: 12,
    fontSize: 13,
    outline: 'none',
    resize: 'vertical',
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
    border:
      '1px solid #e6ded2',
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

  modalActions: {
    position: 'sticky',
    bottom: -18,
    zIndex: 5,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    flexWrap: 'wrap',
    margin: '0 -18px -18px',
    padding: 18,
    background: '#fff',
    borderTop:
      '1px solid #eee6dc',
  },
}