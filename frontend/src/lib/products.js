import { products as localProducts } from '../data/products'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function localFallback(category) {
  const items = category
    ? localProducts.filter(p => p.category === category)
    : localProducts

  return {
    items,
    total: items.length,
    page: 1,
    page_size: items.length,
    pages: 1,
  }
}

function localProductShape(p) {
  return {
    ...p,
    categorie: p.category,
    famille: p.categoryLabel,
    price: p.originalPrice,
    sale_price: p.salePrice,
    discount_percent: p.discount,
    url_image1: p.images?.[0],
    url_image2: p.images?.[1],
    url_image3: p.images?.[2],
    url_image4: p.images?.[3],
    is_featured: p.featured,
    is_bestseller: p.bestSeller,
    is_new: p.isNew,
    reviews_count: p.reviews,
    stock: p.inStock ? 10 : 0,
  }
}

export async function fetchProducts(params = {}) {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value)
    }
  })

  try {
    const res = await fetch(`${BASE}/products?${query.toString()}`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      throw new Error('api-down')
    }

    return res.json()
  } catch {
    const data = localFallback(params.categorie || params.category)

    return {
      ...data,
      items: data.items.map(localProductShape),
    }
  }
}

export async function fetchProductBySlug(slug) {
  try {
    const res = await fetch(`${BASE}/products/slug/${slug}`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      throw new Error('api-down')
    }

    return res.json()
  } catch {
    const p = localProducts.find(p => p.slug === slug)
    return p ? localProductShape(p) : null
  }
}

export async function fetchProductById(id) {
  try {
    const res = await fetch(`${BASE}/products/${id}`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      throw new Error('api-down')
    }

    return res.json()
  } catch {
    const p = localProducts.find(p => p.id === Number(id))
    return p ? localProductShape(p) : null
  }
}

export function mapProduct(p) {
  if (!p) return null

  const price = toNumber(p.price)
const salePrice = null

  const colors = Array.isArray(p.colors) ? p.colors : []
  const sizes = Array.isArray(p.sizes) ? p.sizes : []

  const images = [
    p.url_image1,
    p.url_image2,
    p.url_image3,
    p.url_image4,
    p.url_image5,
  ].filter(url => {
    if (!url) return false

    const lowered = String(url).toLowerCase()

    if (lowered.includes('/img/eglo.png')) return false
    if (lowered.includes('/img/m/')) return false
    if (lowered.includes('/img/p/')) return false
    if (lowered.includes('fr-default')) return false

    return (
      lowered.endsWith('.jpg') ||
      lowered.endsWith('.jpeg') ||
      lowered.endsWith('.png') ||
      lowered.endsWith('.webp')
    )
  })

  if (images.length === 0) {
    return null
  }

  return {
    id: p.id,
    slug: p.slug,
    reference: p.reference,

    name: p.name,
    category: p.categorie || '',
    categoryLabel: p.categorie || p.famille || '',
    marque: p.marque || '',
    rubrique: p.rubrique || '',
    categorie: p.categorie || '',
    famille: p.famille || '',

    originalPrice: price,
    salePrice,
    discount: 0,

    images,

    colors,
    sizes,
    color: colors[0] || '',
    size: sizes[0] || '',

    badge: p.badge || '',
    badgeType: p.badge
      ? p.badge === 'New'
        ? 'new'
        : p.is_bestseller
          ? 'bestseller'
          : 'sale'
      : '',

    inStock: Number(p.stock || 0) > 0,
    featured: Boolean(p.is_featured),
    bestSeller: Boolean(p.is_bestseller),
    isNew: Boolean(p.is_new),

    rating: toNumber(p.rating),
    reviews: toNumber(p.reviews_count),

    description: p.description || '',
    features: Array.isArray(p.features) ? p.features : [],
    specs: p.specs && typeof p.specs === 'object' ? p.specs : {},

    stock: Number(p.stock || 0),
  }
}