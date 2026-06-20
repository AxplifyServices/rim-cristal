const PUBLIC_API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001/api'

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
    famille: product.famille || '',
    categorie: categoryName,
    description: product.description || '',
    price: Number(product.price || 0),

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
      ),
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

export async function getProducts() {
  const response = await fetch(
    `${PUBLIC_API_BASE}/products`,
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

  return unwrapProducts(payload)
    .map(mapProduct)
    .filter(product => product.available)
}

export async function getProductBySlug(slug) {
  const products = await getProducts()

  return (
    products.find(product => {
      return (
        product.slug === String(slug) ||
        String(product.id) === String(slug)
      )
    }) || null
  )
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