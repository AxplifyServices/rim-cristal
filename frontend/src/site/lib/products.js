const PUBLIC_API_BASE =
  (
    process.env
      .NEXT_PUBLIC_API_URL ||
    'http://localhost:3000/api'
  ).replace(/\/$/, '')

function getApiOrigin() {
  if (
    process.env
      .NEXT_PUBLIC_ASSETS_URL
  ) {
    return process.env
      .NEXT_PUBLIC_ASSETS_URL
      .replace(/\/$/, '')
  }

  return PUBLIC_API_BASE.endsWith(
    '/api'
  )
    ? PUBLIC_API_BASE.slice(0, -4)
    : PUBLIC_API_BASE
}

export function resolveImageUrl(
  value
) {
  if (!value) {
    return '/images/product-placeholder.svg'
  }

  const source =
    String(value).trim()

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
    .replace(
      /^backend\//,
      '/'
    )
    .replace(
      /^\/?uploads\//,
      '/uploads/'
    )

  const finalPath =
    normalized.startsWith('/')
      ? normalized
      : `/${normalized}`

  return `${getApiOrigin()}${finalPath}`
}

function toBoolean(
  value,
  defaultValue = false
) {
  if (
    value === undefined ||
    value === null
  ) {
    return defaultValue
  }

  if (
    typeof value === 'boolean'
  ) {
    return value
  }

  return [
    'true',
    '1',
    'yes',
    'oui',
  ].includes(
    String(value).toLowerCase()
  )
}

function normalizeStringArray(
  value
) {
  if (Array.isArray(value)) {
    return value
      .map(item =>
        String(item).trim()
      )
      .filter(Boolean)
  }

  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return []
  }

  if (
    typeof value === 'string'
  ) {
    const trimmedValue =
      value.trim()

    if (!trimmedValue) {
      return []
    }

    try {
      const parsedValue =
        JSON.parse(trimmedValue)

      if (
        Array.isArray(
          parsedValue
        )
      ) {
        return parsedValue
          .map(item =>
            String(item).trim()
          )
          .filter(Boolean)
      }
    } catch {
      return trimmedValue
        .split(',')
        .map(item =>
          item.trim()
        )
        .filter(Boolean)
    }
  }

  return [
    String(value).trim(),
  ].filter(Boolean)
}

function nullableNumber(value) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null
  }

  const number = Number(value)

  return Number.isFinite(number)
    ? number
    : null
}

function normalizeProductImage(
  image,
  fallbackUrl = null
) {
  const original = resolveImageUrl(
    image?.original ||
      fallbackUrl
  )

  const thumbnail =
    resolveImageUrl(
      image?.thumbnail ||
        image?.card ||
        image?.detail ||
        image?.large ||
        original
    )

  const card = resolveImageUrl(
    image?.card ||
      image?.detail ||
      image?.large ||
      image?.thumbnail ||
      original
  )

  const detail =
    resolveImageUrl(
      image?.detail ||
        image?.large ||
        image?.card ||
        original
    )

  const large = resolveImageUrl(
    image?.large ||
      image?.detail ||
      image?.card ||
      original
  )

  return {
    slot:
      String(
        image?.slot || ''
      ).trim(),

    displayOrder:
      Number.isFinite(
        Number(
          image?.displayOrder
        )
      )
        ? Number(
            image.displayOrder
          )
        : 0,

    original,
    thumbnail,
    card,
    detail,
    large,
  }
}

export function mapProduct(
  product
) {
  const legacyImageUrls = [
    product.url_image1,
    product.url_image2,
    product.url_image3,
    product.url_image4,
    product.url_image5,
  ]
    .map(value => {
      return String(
        value || ''
      ).trim()
    })
    .filter(Boolean)

  const apiImages =
    Array.isArray(
      product.images
    )
      ? product.images
      : []

  const normalizedImages =
    apiImages.length > 0
      ? apiImages
          .map(
            (
              image,
              index
            ) => {
              return normalizeProductImage(
                image,
                legacyImageUrls[
                  index
                ] ||
                  legacyImageUrls[0] ||
                  null
              )
            }
          )
          .sort(
            (first, second) => {
              return (
                first.displayOrder -
                second.displayOrder
              )
            }
          )
      : legacyImageUrls.map(
          (url, index) => {
            return normalizeProductImage(
              {
                slot:
                  `PRODUCT_IMAGE_${index + 1}`,

                displayOrder:
                  index,

                original: url,
                thumbnail: url,
                card: url,
                detail: url,
                large: url,
              },
              url
            )
          }
        )

  const uniqueImages =
    normalizedImages.filter(
      (
        image,
        index,
        list
      ) => {
        return (
          list.findIndex(
            candidate =>
              candidate.original ===
              image.original
          ) === index
        )
      }
    )

  const primaryImage =
    uniqueImages[0] ||
    normalizeProductImage({
      slot:
        'PRODUCT_IMAGE_1',

      original:
        '/images/product-placeholder.svg',
    })

  const categoryName =
    product.categorie ||
    product.category?.name_fr ||
    product.category?.name ||
    ''

  const hasColorVariants =
    toBoolean(
      product.has_color_variants,
      false
    )

  const originalPrice =
    Number(
      product.price || 0
    )

  const promotionPercentage =
    product.promotion_percentage ===
      null ||
    product.promotion_percentage ===
      undefined ||
    product.promotion_percentage ===
      ''
      ? null
      : Number(
          product.promotion_percentage
        )

  const promotionalPrice =
    Number(
      product.promotional_price ??
      originalPrice
    )

  const hasPromotion =
    Boolean(
      product.has_promotion
    ) &&
    Number.isFinite(
      promotionPercentage
    ) &&
    promotionPercentage > 0 &&
    promotionPercentage < 100 &&
    Number.isFinite(
      promotionalPrice
    ) &&
    promotionalPrice <
      originalPrice    

const sizeVariants =
  Array.isArray(
    product.product_size_variants
  )
    ? product.product_size_variants
        .map(variant => {
          const widthCm =
            nullableNumber(
              variant.width_cm
            )

          const depthCm =
            nullableNumber(
              variant.depth_cm
            )

          const heightCm =
            nullableNumber(
              variant.height_cm
            )

          const dimensions = [
            widthCm,
            depthCm,
            heightCm,
          ]
            .filter(value => {
              return (
                value !== null &&
                value !== undefined
              )
            })
            .map(value => {
              return new Intl.NumberFormat(
                'fr-MA',
                {
                  maximumFractionDigits:
                    2,
                }
              ).format(value)
            })

          const generatedLabel =
            dimensions.length > 0
              ? `${dimensions.join(
                  ' × '
                )} cm`
              : ''

          return {
            id:
              String(
                variant.id
              ),

            productId:
              Number(
                variant.product_id ||
                  product.id
              ),

            label:
              String(
                variant.label ||
                  generatedLabel ||
                  variant.reference ||
                  ''
              ).trim(),

            reference:
              String(
                variant.reference || ''
              ).trim(),

            widthCm,

            depthCm,

            heightCm,

            price:
              Number(
                variant.price || 0
              ),

            originalPrice:
              Number(
                variant.original_price ??
                  variant.price ??
                  0
              ),

            promotionalPrice:
              Number(
                variant.promotional_price ??
                  variant.price ??
                  0
              ),

            promotionPercentage:
              variant
                .promotion_percentage ===
                null ||
              variant
                .promotion_percentage ===
                undefined
                ? null
                : Number(
                    variant
                      .promotion_percentage
                  ),

            hasPromotion:
              Boolean(
                variant.has_promotion
              ),

            stock:
              Math.max(
                Number(
                  variant.stock || 0
                ),
                0
              ),

            isPrimary:
              toBoolean(
                variant.is_primary,
                false
              ),

            isActive:
              toBoolean(
                variant.is_active,
                true
              ),

            displayOrder:
              Number(
                variant.display_order ||
                  0
              ),
          }
        })
        .filter(variant => {
          return variant.isActive
        })
        .sort(
          (
            firstVariant,
            secondVariant
          ) => {
            if (
              firstVariant.isPrimary !==
              secondVariant.isPrimary
            ) {
              return firstVariant.isPrimary
                ? -1
                : 1
            }

            if (
              firstVariant.displayOrder !==
              secondVariant.displayOrder
            ) {
              return (
                firstVariant.displayOrder -
                secondVariant.displayOrder
              )
            }

            return firstVariant.id.localeCompare(
              secondVariant.id
            )
          }
        )
    : []

const hasSizeVariants =
  toBoolean(
    product.has_size_variants,
    false
  ) &&
  sizeVariants.length > 0

const primarySizeVariant =
  sizeVariants.find(
    variant => variant.isPrimary
  ) ||
  sizeVariants[0] ||
  null      

  return {
    id: product.id,

    slug:
      product.slug ||
      String(product.id),

    name:
      product.name ||
      'Produit',

    reference:
      product.reference || '',

    marque:
      product.marque || '',

    rubrique:
      product.rubrique || '',

    famille:
      product.famille || '',

    categorie:
      categoryName,

    description:
      product.description || '',

price:
  hasPromotion
    ? promotionalPrice
    : originalPrice,

originalPrice,

promotionalPrice:
  hasPromotion
    ? promotionalPrice
    : originalPrice,

promotionPercentage:
  hasPromotion
    ? promotionPercentage
    : null,

hasPromotion,

stock:
  hasSizeVariants &&
  primarySizeVariant
    ? primarySizeVariant.stock
    : Math.max(
        Number(
          product.stock || 0
        ),
        0
      ),

hasSizeVariants,

sizeVariants,

primarySizeVariant,

hasColorVariants,

    colors:
      hasColorVariants
        ? normalizeStringArray(
            product.colors
          )
        : [],

    widthCm:
      nullableNumber(
        product.width_cm
      ),

    depthCm:
      nullableNumber(
        product.depth_cm
      ),

    heightCm:
      nullableNumber(
        product.height_cm
      ),

imageVariants:
  uniqueImages,

/*
 * Compatibilité avec les composants
 * qui attendent encore une liste d'URL.
 *
 * Sur les cartes, on utilise les variantes CARD.
 */
images:
  uniqueImages.map(
    image =>
      image.card
  ),

/*
 * Image légère pour les cartes et
 * ajout au panier.
 */
image:
  primaryImage.card,

thumbnailImage:
  primaryImage.thumbnail,

cardImage:
  primaryImage.card,

detailImage:
  primaryImage.detail,

largeImage:
  primaryImage.large,

    badge:
      product.badge || '',

    isFeatured:
      toBoolean(
        product.is_featured,
        false
      ),

    isNew:
      toBoolean(
        product.is_new,
        false
      ),

    isBestseller:
      toBoolean(
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

inStock:
  hasSizeVariants
    ? sizeVariants.some(
        variant =>
          variant.stock > 0
      )
    : Number(
        product.stock || 0
      ) > 0,

isOutOfStock:
  hasSizeVariants
    ? sizeVariants.every(
        variant =>
          variant.stock <= 0
      )
    : Number(
        product.stock || 0
      ) <= 0,
  }
}

function unwrapProducts(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (
    Array.isArray(
      payload?.items
    )
  ) {
    return payload.items
  }

  if (
    Array.isArray(
      payload?.products
    )
  ) {
    return payload.products
  }

  if (
    Array.isArray(
      payload?.data
    )
  ) {
    return payload.data
  }

  return []
}

function appendListParams(
  params,
  key,
  values
) {
  const normalizedValues =
    Array.isArray(values)
      ? values
      : values
        ? [values]
        : []

  normalizedValues
    .map(value =>
      String(value).trim()
    )
    .filter(Boolean)
    .forEach(value => {
      params.append(
        key,
        value
      )
    })
}

function buildProductsQuery({
  page = 1,
  pageSize = 10,
  rubrique = [],
  categorie = [],
  famille = [],
  minPrice,
  maxPrice,
  search = '',
  featured,
  bestseller,
  promotion,
  recent,
  isNew,
} = {}) {
  const params =
    new URLSearchParams()

  params.set(
    'page',
    String(
      Math.max(
        Number(page) || 1,
        1
      )
    )
  )

  params.set(
    'page_size',
    String(
      Math.min(
        Math.max(
          Number(pageSize) ||
            10,
          1
        ),
        20
      )
    )
  )

  appendListParams(
    params,
    'rubrique',
    rubrique
  )

  appendListParams(
    params,
    'categorie',
    categorie
  )

  appendListParams(
    params,
    'famille',
    famille
  )

  if (
    minPrice !== undefined &&
    minPrice !== null &&
    minPrice !== ''
  ) {
    params.set(
      'prix_min',
      String(minPrice)
    )
  }

  if (
    maxPrice !== undefined &&
    maxPrice !== null &&
    maxPrice !== ''
  ) {
    params.set(
      'prix_max',
      String(maxPrice)
    )
  }

  if (
    String(search).trim()
  ) {
    params.set(
      'search',
      String(search).trim()
    )
  }

  if (
    featured !== undefined
  ) {
    params.set(
      'featured',
      String(featured)
    )
  }

if (
  bestseller !== undefined
) {
  params.set(
    'bestseller',
    String(bestseller)
  )
}

if (
  promotion !== undefined
) {
  params.set(
    'promotion',
    String(promotion)
  )
}

if (
  recent !== undefined
) {
  params.set(
    'recent',
    String(recent)
  )
}

if (
  isNew !== undefined
) {
    params.set(
      'is_new',
      String(isNew)
    )
  }

  return params.toString()
}

export async function getProductsPage(
  options = {}
) {
  const query =
    buildProductsQuery(options)

  const isServer =
    typeof window ===
    'undefined'

  const response = await fetch(
    `${PUBLIC_API_BASE}/products?${query}`,
    {
      method: 'GET',

      headers: {
        Accept:
          'application/json',
      },

      cache: isServer
        ? 'force-cache'
        : 'no-store',

      ...(isServer
        ? {
            next: {
              revalidate: 60,
            },
          }
        : {}),
    }
  )

  if (!response.ok) {
    throw new Error(
      `Impossible de charger les produits : ${response.status}`
    )
  }

  const payload =
    await response.json()

  const items =
    unwrapProducts(payload)
      .map(mapProduct)
      .filter(
        product =>
          product.available
      )

  return {
    items,

    total:
      Number(
        payload?.total ||
          items.length
      ),

    page:
      Number(
        payload?.page || 1
      ),

    pageSize:
      Number(
        payload?.page_size ||
          options.pageSize ||
          10
      ),

    pages:
      Math.max(
        Number(
          payload?.pages || 1
        ),
        1
      ),
  }
}

export async function getProductFilters({
  rubrique = [],
  categorie = [],
} = {}) {
  const params =
    new URLSearchParams()

  appendListParams(
    params,
    'rubrique',
    rubrique
  )

  appendListParams(
    params,
    'categorie',
    categorie
  )

  const query =
    params.toString()

  const response = await fetch(
    `${PUBLIC_API_BASE}/products/filters${
      query ? `?${query}` : ''
    }`,
    {
      method: 'GET',
      headers: {
        Accept:
          'application/json',
      },
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    throw new Error(
      `Impossible de charger les filtres : ${response.status}`
    )
  }

  const payload =
    await response.json()

  return {
    rubriques:
      Array.isArray(
        payload?.rubriques
      )
        ? payload.rubriques
        : [],

    categories:
      Array.isArray(
        payload?.categories
      )
        ? payload.categories
        : [],

    families:
      Array.isArray(
        payload?.families
      )
        ? payload.families
        : [],

    price: {
      min:
        Number(
          payload?.price?.min ||
            0
        ),

      max:
        Number(
          payload?.price?.max ||
            0
        ),
    },
  }
}

export async function getProducts(
  options = {}
) {
  const result =
    await getProductsPage({
      page: 1,
      pageSize: 10,
      ...options,
    })

  return result.items
}

export async function getProductBySlug(
  slug
) {
  const response = await fetch(
    `${PUBLIC_API_BASE}/products/slug/${encodeURIComponent(
      String(slug)
    )}`,
    {
      method: 'GET',
      headers: {
        Accept:
          'application/json',
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

export function formatPrice(
  price,
  locale = 'fr'
) {
  const language =
    locale === 'ar'
      ? 'ar-MA'
      : 'fr-MA'

  return new Intl.NumberFormat(
    language,
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  ).format(
    Number(price || 0)
  )
}