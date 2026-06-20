const PUBLIC_API_BASE =
  (
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3000/api'
  ).replace(/\/$/, '')

function getApiOrigin() {
  if (process.env.NEXT_PUBLIC_ASSETS_URL) {
    return process.env.NEXT_PUBLIC_ASSETS_URL.replace(/\/$/, '')
  }

  return PUBLIC_API_BASE.endsWith('/api')
    ? PUBLIC_API_BASE.slice(0, -4)
    : PUBLIC_API_BASE
}

export function resolveImageUrl(value) {
  if (!value) {
    return '/images/product-placeholder.svg'
  }

  const source = String(value).trim()

  if (!source) {
    return '/images/product-placeholder.svg'
  }

  if (
    source.startsWith('http://') ||
    source.startsWith('https://') ||
    source.startsWith('data:') ||
    source.startsWith('blob:')
  ) {
    return source
  }

  const normalized = source
    .replace(/\\/g, '/')
    .replace(/^backend\//, '/')
    .replace(/^\/?uploads\//, '/uploads/')

  const finalPath = normalized.startsWith('/')
    ? normalized
    : `/${normalized}`

  return `${getApiOrigin()}${finalPath}`
}

function toBoolean(value, defaultValue = false) {
  if (value === undefined || value === null) {
    return defaultValue
  }

  if (typeof value === 'boolean') {
    return value
  }

  return ['true', '1', 'yes', 'oui'].includes(
    String(value).toLowerCase()
  )
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .map(item => String(item).trim())
      .filter(Boolean)
  }

  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return []
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim()

    if (!trimmedValue) {
      return []
    }

    try {
      const parsedValue =
        JSON.parse(trimmedValue)

      if (Array.isArray(parsedValue)) {
        return parsedValue
          .map(item =>
            String(item).trim()
          )
          .filter(Boolean)
      }
    } catch {
      return trimmedValue
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
    }
  }

  return [String(value).trim()]
    .filter(Boolean)
}

export function mapProduct(product) {
  const images = [
    product.url_image1,
    product.url_image2,
    product.url_image3,
    product.url_image4,
    product.url_image5,
  ]
    .filter(Boolean)
    .map(resolveImageUrl)

  const categoryName =
    product.categorie ||
    product.category?.name_fr ||
    product.category?.name ||
    ''

  return {
    id: product.id,
    slug: product.slug || String(product.id),
    name: product.name || 'Produit',
    reference: product.reference || '',
marque: product.marque || '',
rubrique: product.rubrique || '',
famille: product.famille || '',
categorie: categoryName,
description: product.description || '',
price: Number(product.price || 0),
stock: Math.max(
  Number(product.stock || 0),
  0
),
sizes: normalizeStringArray(
  product.sizes
),
colors: normalizeStringArray(
  product.colors
),

    images:
      images.length > 0
        ? images
        : ['/images/product-placeholder.svg'],

    image:
      images[0] ||
      '/images/product-placeholder.svg',

    badge: product.badge || '',

    isFeatured: toBoolean(
      product.is_featured,
      false
    ),

    isNew: toBoolean(
      product.is_new,
      false
    ),

    isBestseller: toBoolean(
      product.is_bestseller,
      false
    ),

available:
  toBoolean(
    product.is_available_on_site,
    true
  ) &&
  toBoolean(
    product.is_active,
    true
  ) &&
  Number(product.stock || 0) > 0,
  }
}

function unwrapProducts(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.items)) {
    return payload.items
  }

  if (Array.isArray(payload?.products)) {
    return payload.products
  }

  if (Array.isArray(payload?.data)) {
    return payload.data
  }

  return []
}

function buildProductsQuery({
  page = 1,
  pageSize = 10,
  rubrique = '',
  categorie = '',
  search = '',
  featured,
  bestseller,
  isNew,
} = {}) {
  const params = new URLSearchParams()

  params.set(
    'page',
    String(Math.max(Number(page) || 1, 1))
  )

  params.set(
    'page_size',
    String(
      Math.min(
        Math.max(Number(pageSize) || 10, 1),
        20
      )
    )
  )

  if (rubrique) {
    params.set('rubrique', rubrique)
  }

  if (categorie) {
    params.set('categorie', categorie)
  }

  if (search.trim()) {
    params.set('search', search.trim())
  }

  if (featured !== undefined) {
    params.set('featured', String(featured))
  }

  if (bestseller !== undefined) {
    params.set(
      'bestseller',
      String(bestseller)
    )
  }

  if (isNew !== undefined) {
    params.set('is_new', String(isNew))
  }

  return params.toString()
}

export async function getProductsPage(
  options = {}
) {
  const query = buildProductsQuery(options)

  const response = await fetch(
    `${PUBLIC_API_BASE}/products?${query}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    throw new Error(
      `Impossible de charger les produits : ${response.status}`
    )
  }

  const payload = await response.json()

  const items = unwrapProducts(payload)
    .map(mapProduct)
    .filter(product => product.available)

  return {
    items,
    total: Number(payload?.total || items.length),
    page: Number(payload?.page || 1),
    pageSize: Number(
      payload?.page_size || options.pageSize || 10
    ),
    pages: Math.max(
      Number(payload?.pages || 1),
      1
    ),
  }
}

export async function getProducts(
  options = {}
) {
  const result = await getProductsPage({
    page: 1,
    pageSize: 10,
    ...options,
  })

  return result.items
}

export async function getProductBySlug(slug) {
  const response = await fetch(
    `${PUBLIC_API_BASE}/products/slug/${encodeURIComponent(
      String(slug)
    )}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    }
  )

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(
      `Impossible de charger le produit : ${response.status}`
    )
  }

  const product = mapProduct(
    await response.json()
  )

  return product.available
    ? product
    : null
}

export function formatPrice(price, locale = 'fr') {
  const language =
    locale === 'en'
      ? 'en-US'
      : 'fr-MA'

  return new Intl.NumberFormat(language, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(price || 0))
}