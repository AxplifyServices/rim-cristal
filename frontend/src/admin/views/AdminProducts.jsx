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

const PRODUCTS_PAGE_SIZE = 10

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

function createEmptySizeVariant({
  isPrimary = false,
} = {}) {
  return {
    id: null,
    label: '',
    reference: '',
    width_cm: '',
    depth_cm: '',
    height_cm: '',
    price: '',
    price_wholesale: 0,
    wholesale_min_qty: 1,
    stock: 0,
    is_primary: isPrimary,
    is_active: true,
  }
}

function createEmptyForm() {
  return {
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

    weight: '',

    has_size_variants: false,

    size_variants: [
      createEmptySizeVariant({
        isPrimary: true,
      }),
    ],

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

function nonNegativeNumber(
  value,
  fallback = 0
) {
  const number = Number(value)

  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    return fallback
  }

  return number
}

function positiveInteger(
  value,
  fallback = 1
) {
  const number = Number(value)

  if (
    !Number.isInteger(number) ||
    number < 1
  ) {
    return fallback
  }

  return number
}

function nonNegativeInteger(
  value,
  fallback = 0
) {
  const number = Number(value)

  if (
    !Number.isInteger(number) ||
    number < 0
  ) {
    return fallback
  }

  return number
}

function formatDimensionValue(value) {
  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {
    return ''
  }

  const number = Number(value)

  if (!Number.isFinite(number)) {
    return ''
  }

  return Number.isInteger(number)
    ? String(number)
    : String(number).replace(
        '.',
        ','
      )
}

function buildSizeLabel(variant) {
  const dimensions = [
    variant.width_cm,
    variant.depth_cm,
    variant.height_cm,
  ]
    .map(formatDimensionValue)
    .filter(Boolean)

  if (dimensions.length === 0) {
    return 'Taille standard'
  }

  return `${dimensions.join(
    ' × '
  )} cm`
}

function getPrimaryVariant(product) {
  const variants = Array.isArray(
    product.product_size_variants
  )
    ? product.product_size_variants
    : []

  return (
    variants.find(
      variant =>
        variant.is_primary
    ) ||
    variants[0] ||
    null
  )
}

function getProductSizesCount(product) {
  if (
    !Array.isArray(
      product.product_size_variants
    )
  ) {
    return 0
  }

  return product.product_size_variants
    .filter(
      variant =>
        variant.is_active !== false
    )
    .length
}

export default function AdminProducts() {
  const { t, locale } =
    useAdminI18n()

  const [user, setUser] =
    useState(null)

  const [products, setProducts] =
    useState([])

  const [page, setPage] =
    useState(1)

  const [
    pagination,
    setPagination,
  ] = useState({
    page: 1,
    pages: 1,
    total: 0,
    pageSize:
      PRODUCTS_PAGE_SIZE,
  })

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
    useState(() =>
      createEmptyForm()
    )

  const isAdmin =
    user?.role === 'admin'

  const options = useMemo(() => {
    function unique(field) {
      return [
        ...new Set(
          products
            .map(
              product =>
                product[field]
            )
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
        typeof Intl !==
          'undefined' &&
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

  async function load(
    requestedPage = page
  ) {
    const safePage = Math.max(
      Number(requestedPage) || 1,
      1
    )

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

        const allProducts =
          Array.isArray(data)
            ? data.map(row => ({
                ...row.products,

                pos_quantity:
                  row.quantity,

                selected_size_variant:
                  row.product_size_variants ||
                  null,
              }))
            : []

        const total =
          allProducts.length

        const pages =
          Math.max(
            Math.ceil(
              total /
                PRODUCTS_PAGE_SIZE
            ),
            1
          )

        const resolvedPage =
          Math.min(
            safePage,
            pages
          )

        const offset =
          (resolvedPage - 1) *
          PRODUCTS_PAGE_SIZE

        setProducts(
          allProducts.slice(
            offset,
            offset +
              PRODUCTS_PAGE_SIZE
          )
        )

        setPagination({
          page: resolvedPage,
          pages,
          total,
          pageSize:
            PRODUCTS_PAGE_SIZE,
        })

        if (
          resolvedPage !==
          safePage
        ) {
          setPage(
            resolvedPage
          )
        }

        return
      }

      const query =
        new URLSearchParams({
          include_inactive:
            'true',

          include_unavailable_on_site:
            'true',

          page:
            String(safePage),

          page_size:
            String(
              PRODUCTS_PAGE_SIZE
            ),
        })

      const data =
        await adminApi.get(
          `/products?${query.toString()}`
        )

      const items =
        Array.isArray(
          data?.items
        )
          ? data.items
          : []

      const total =
        Number(data?.total || 0)

      const pages =
        Math.max(
          Number(data?.pages || 1),
          1
        )

      const resolvedPage =
        Math.min(
          Math.max(
            Number(
              data?.page ||
                safePage
            ),
            1
          ),
          pages
        )

      setProducts(items)

      setPagination({
        page: resolvedPage,
        pages,
        total,
        pageSize:
          Number(
            data?.page_size ||
              PRODUCTS_PAGE_SIZE
          ),
      })

      if (
        resolvedPage !==
        safePage
      ) {
        setPage(
          resolvedPage
        )
      }
    } catch (loadError) {
      setProducts([])

      setPagination({
        page: safePage,
        pages: 1,
        total: 0,
        pageSize:
          PRODUCTS_PAGE_SIZE,
      })

      setError(
        loadError.message
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(page)
  }, [page])

  function goToPage(
    nextPage
  ) {
    if (loading) {
      return
    }

    const safePage =
      Math.min(
        Math.max(
          Number(nextPage) || 1,
          1
        ),
        pagination.pages
      )

    if (
      safePage === page
    ) {
      return
    }

    setPage(safePage)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  function getVisiblePages() {
    const totalPages =
      pagination.pages

    const visiblePages = []

    const startPage =
      Math.max(
        1,
        Math.min(
          page - 2,
          totalPages - 4
        )
      )

    const endPage =
      Math.min(
        totalPages,
        startPage + 4
      )

    for (
      let currentPage =
        startPage;
      currentPage <=
      endPage;
      currentPage += 1
    ) {
      visiblePages.push(
        currentPage
      )
    }

    return visiblePages
  }  

  useEffect(() => {
    if (!formOpen) {
      return undefined
    }

    const previousOverflow =
      document.body.style
        .overflow

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
      if (
        event.key === 'Escape'
      ) {
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
  }, [formOpen, saving])

  function productToForm(product) {
    const hasColorVariants =
      Boolean(
        product.has_color_variants
      )

    const backendVariants =
      Array.isArray(
        product.product_size_variants
      )
        ? product.product_size_variants
        : []

    const sortedVariants = [
      ...backendVariants,
    ].sort(
      (
        first,
        second
      ) => {
        if (
          Boolean(
            first.is_primary
          ) !==
          Boolean(
            second.is_primary
          )
        ) {
          return first.is_primary
            ? -1
            : 1
        }

        const orderDifference =
          Number(
            first.display_order ||
              0
          ) -
          Number(
            second.display_order ||
              0
          )

        if (
          orderDifference !== 0
        ) {
          return orderDifference
        }

        return String(
          first.id
        ).localeCompare(
          String(second.id)
        )
      }
    )

    const sizeVariants =
      sortedVariants.length > 0
        ? sortedVariants.map(
            (
              variant,
              index
            ) => ({
              id:
                variant.id !==
                  undefined &&
                variant.id !==
                  null
                  ? String(
                      variant.id
                    )
                  : null,

              label:
                variant.label ||
                '',

              reference:
                variant.reference ||
                '',

              width_cm:
                variant.width_cm ??
                '',

              depth_cm:
                variant.depth_cm ??
                '',

              height_cm:
                variant.height_cm ??
                '',

              price:
                variant.price ??
                '',

              price_wholesale:
                variant.price_wholesale ??
                0,

              wholesale_min_qty:
                variant.wholesale_min_qty ??
                1,

              stock:
                variant.stock ??
                0,

              is_primary:
                index === 0,

              is_active:
                variant.is_active !==
                false,
            })
          )
        : [
            {
              ...createEmptySizeVariant(
                {
                  isPrimary:
                    true,
                }
              ),

              label:
                buildSizeLabel({
                  width_cm:
                    product.width_cm,

                  depth_cm:
                    product.depth_cm,

                  height_cm:
                    product.height_cm,
                }),

              width_cm:
                product.width_cm ??
                '',

              depth_cm:
                product.depth_cm ??
                '',

              height_cm:
                product.height_cm ??
                '',

              price:
                product.price ??
                '',

              price_wholesale:
                product.price_wholesale ??
                0,

              wholesale_min_qty:
                product.wholesale_min_qty ??
                1,

              stock:
                product.stock ??
                0,
            },
          ]

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

      weight:
        product.weight ?? '',

      has_size_variants:
        Boolean(
          product.has_size_variants
        ) &&
        sizeVariants.length > 1,

      size_variants:
        sizeVariants,

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
        product.is_active !==
        false,

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
        product.origin_country ||
        '',

      collection_name:
        product.collection_name ||
        '',

      seo_title:
        product.seo_title ||
        '',

      seo_description:
        product.seo_description ||
        '',
    }
  }

  function validateForm() {
    if (!form.name.trim()) {
      throw new Error(
        'Le nom du produit est obligatoire.'
      )
    }

    if (!form.rubrique.trim()) {
      throw new Error(
        'La rubrique du produit est obligatoire.'
      )
    }

    if (
      !Array.isArray(
        form.size_variants
      ) ||
      form.size_variants
        .length === 0
    ) {
      throw new Error(
        'La taille principale est obligatoire.'
      )
    }

    if (
      form.has_size_variants &&
      form.size_variants
        .length < 2
    ) {
      throw new Error(
        'Ajoutez au moins une taille supplémentaire.'
      )
    }

    form.size_variants.forEach(
      (
        variant,
        index
      ) => {
        const sizeName =
          index === 0
            ? 'taille principale'
            : `taille ${index + 1}`

        const price =
          Number(
            variant.price
          )

        if (
          variant.price === '' ||
          !Number.isFinite(price) ||
          price < 0
        ) {
          throw new Error(
            `Le prix de la ${sizeName} est invalide.`
          )
        }

        const wholesalePrice =
          Number(
            variant.price_wholesale ||
              0
          )

        if (
          !Number.isFinite(
            wholesalePrice
          ) ||
          wholesalePrice < 0
        ) {
          throw new Error(
            `Le prix de gros de la ${sizeName} est invalide.`
          )
        }

        const wholesaleMinQty =
          Number(
            variant.wholesale_min_qty
          )

        if (
          !Number.isInteger(
            wholesaleMinQty
          ) ||
          wholesaleMinQty < 1
        ) {
          throw new Error(
            `Le seuil de gros de la ${sizeName} doit être un entier supérieur ou égal à 1.`
          )
        }

        const stock =
          Number(
            variant.stock
          )

        if (
          !Number.isInteger(
            stock
          ) ||
          stock < 0
        ) {
          throw new Error(
            `Le stock de la ${sizeName} doit être un entier positif ou nul.`
          )
        }

        const dimensions = [
          {
            label: 'largeur',
            value:
              variant.width_cm,
          },
          {
            label:
              'profondeur',
            value:
              variant.depth_cm,
          },
          {
            label: 'hauteur',
            value:
              variant.height_cm,
          },
        ]

        dimensions.forEach(
          dimension => {
            if (
              dimension.value ===
                '' ||
              dimension.value ===
                null ||
              dimension.value ===
                undefined
            ) {
              return
            }

            const value =
              Number(
                dimension.value
              )

            if (
              !Number.isFinite(
                value
              ) ||
              value < 0
            ) {
              throw new Error(
                `La ${dimension.label} de la ${sizeName} est invalide.`
              )
            }
          }
        )
      }
    )
  }

  function formToPayload() {
    validateForm()

    const hasColorVariants =
      Boolean(
        form.has_color_variants
      )

    const hasSizeVariants =
      Boolean(
        form.has_size_variants
      )

    const sourceVariants =
      hasSizeVariants
        ? form.size_variants
        : [
            form.size_variants[0],
          ]

    const variantsToSend =
      sourceVariants.map(
        (
          variant,
          index
        ) => {
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

          return {
            ...(variant.id
              ? {
                  id:
                    String(
                      variant.id
                    ),
                }
              : {}),

            label:
              String(
                variant.label ||
                  ''
              ).trim() ||
              buildSizeLabel(
                variant
              ),

            reference:
              String(
                variant.reference ||
                  ''
              ).trim() ||
              null,

            width_cm:
              widthCm,

            depth_cm:
              depthCm,

            height_cm:
              heightCm,

            price:
              nonNegativeNumber(
                variant.price
              ),

            price_wholesale:
              nonNegativeNumber(
                variant.price_wholesale
              ),

            wholesale_min_qty:
              positiveInteger(
                variant.wholesale_min_qty
              ),

            stock:
              nonNegativeInteger(
                variant.stock
              ),

            is_primary:
              index === 0,

            is_active:
              index === 0
                ? true
                : variant.is_active !==
                  false,

            display_order:
              index,
          }
        }
      )

    const primaryVariant =
      variantsToSend[0]

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
        form.url_image1 ||
        null,

      url_image2:
        form.url_image2 ||
        null,

      url_image3:
        form.url_image3 ||
        null,

      url_image4:
        form.url_image4 ||
        null,

      url_image5:
        form.url_image5 ||
        null,

      price:
        primaryVariant.price,

      price_wholesale:
        primaryVariant
          .price_wholesale,

      wholesale_min_qty:
        primaryVariant
          .wholesale_min_qty,

      stock:
        variantsToSend
          .filter(
            variant =>
              variant.is_active
          )
          .reduce(
            (
              total,
              variant
            ) =>
              total +
              variant.stock,
            0
          ),

      width_cm:
        primaryVariant.width_cm,

      depth_cm:
        primaryVariant.depth_cm,

      height_cm:
        primaryVariant.height_cm,

      has_size_variants:
        hasSizeVariants &&
        variantsToSend.length >
          1,

      size_variants:
        variantsToSend,

      weight:
        nullableNumber(
          form.weight
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
        Boolean(
          form.is_active
        ),

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
        form.origin_country ||
        null,

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

  function updateForm(
    name,
    value
  ) {
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

      if (
        name ===
          'has_size_variants'
      ) {
        if (value === true) {
          return {
            ...current,

            has_size_variants:
              true,

            size_variants:
              current
                .size_variants
                .length > 0
                ? current
                    .size_variants
                : [
                    createEmptySizeVariant(
                      {
                        isPrimary:
                          true,
                      }
                    ),
                  ],
          }
        }

        return {
          ...current,

          has_size_variants:
            false,

          size_variants: [
            {
              ...(
                current
                  .size_variants[0] ||
                createEmptySizeVariant(
                  {
                    isPrimary:
                      true,
                  }
                )
              ),

              is_primary:
                true,

              is_active:
                true,
            },
          ],
        }
      }

      return {
        ...current,
        [name]: value,
      }
    })
  }

  function updateSizeVariant(
    index,
    field,
    value
  ) {
    setForm(current => ({
      ...current,

      size_variants:
        current.size_variants.map(
          (
            variant,
            variantIndex
          ) =>
            variantIndex ===
            index
              ? {
                  ...variant,
                  [field]:
                    value,
                }
              : variant
        ),
    }))
  }

  function addSizeVariant() {
    setForm(current => ({
      ...current,

      has_size_variants:
        true,

      size_variants: [
        ...current.size_variants,

        createEmptySizeVariant(),
      ],
    }))
  }

  function removeSizeVariant(
    index
  ) {
    if (index === 0) {
      return
    }

    setForm(current => {
      const nextVariants =
        current.size_variants
          .filter(
            (
              _variant,
              variantIndex
            ) =>
              variantIndex !==
              index
          )
          .map(
            (
              variant,
              variantIndex
            ) => ({
              ...variant,

              is_primary:
                variantIndex ===
                0,

              is_active:
                variantIndex ===
                0
                  ? true
                  : variant.is_active,
            })
          )

      return {
        ...current,

        has_size_variants:
          nextVariants.length >
          1,

        size_variants:
          nextVariants,
      }
    })
  }

  function openCreate() {
    setEditingProduct(null)
    setError('')
    setForm(
      createEmptyForm()
    )
    setFormOpen(true)
  }

  function openEdit(product) {
    setEditingProduct(product)
    setError('')
    setForm(
      productToForm(product)
    )
    setFormOpen(true)
  }

  function closeForm() {
    if (saving) {
      return
    }

    setFormOpen(false)
    setEditingProduct(null)
    setError('')
    setForm(
      createEmptyForm()
    )
  }

  async function saveProduct(
    event
  ) {
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
      setForm(
        createEmptyForm()
      )

      await load(page)
    } catch (saveError) {
      setError(
        saveError.message
      )
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

      const shouldGoBack =
        products.length === 1 &&
        page > 1

      if (shouldGoBack) {
        setPage(
          currentPage =>
            Math.max(
              currentPage - 1,
              1
            )
        )
      } else {
        await load(page)
      }
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

    const data =
      new FormData()

    data.append(
      'file',
      file
    )

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

          <p
            style={
              styles.subtitle
            }
          >
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
            {t(
              'products.create'
            )}
          </button>
        )}
      </div>

      {error && !formOpen && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      <div style={styles.card}>
        {loading ? (
          <div style={styles.empty}>
            {t(
              'common.loading'
            )}
          </div>
        ) : products.length ===
          0 ? (
          <div style={styles.empty}>
            {t('common.empty')}
          </div>
        ) : (
          <>
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
                    {t(
                      'products.product'
                    )}
                  </th>

                  <th
                    style={styles.th}
                  >
                    {t(
                      'products.category'
                    )}
                  </th>

                  <th
                    style={styles.th}
                  >
                    Tailles
                  </th>

                  <th
                    style={styles.th}
                  >
                    {t(
                      'products.retailPrice'
                    )}
                  </th>

                  <th
                    style={styles.th}
                  >
                    {t(
                      'products.wholesalePrice'
                    )}
                  </th>

                  <th
                    style={styles.th}
                  >
                    {isAdmin
                      ? t(
                          'products.globalStock'
                        )
                      : t(
                          'products.posStock'
                        )}
                  </th>

                  <th
                    style={styles.th}
                  >
                    {t(
                      'products.status'
                    )}
                  </th>

                  {isAdmin && (
                    <th
                      style={
                        styles.th
                      }
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
                  product => {
                    const primaryVariant =
                      getPrimaryVariant(
                        product
                      )

                    const sizesCount =
                      getProductSizesCount(
                        product
                      )

                    return (
                      <tr
                        key={
                          product.id
                        }
                      >
                        <td
                          style={
                            styles.td
                          }
                        >
                          <div
                            style={
                              styles.productIdentity
                            }
                          >
                            <ProductThumbnail
                              src={
                                product.url_image1
                              }
                              alt={
                                product.name
                              }
                            />

                            <div
                              style={
                                styles.productIdentityText
                              }
                            >
                              <strong
                                style={
                                  styles.productName
                                }
                              >
                                {
                                  product.name
                                }
                              </strong>

                              <span
                                style={
                                  styles.muted
                                }
                              >
                                {
                                  product.reference
                                }
                              </span>
                            </div>
                          </div>
                        </td>

                        <td
                          style={
                            styles.td
                          }
                        >
                          {product.categorie ||
                            product.rubrique ||
                            '-'}
                        </td>

                        <td
                          style={
                            styles.td
                          }
                        >
                          {product.has_size_variants &&
                          sizesCount >
                            1 ? (
                            <>
                              <strong>
                                {
                                  sizesCount
                                }{' '}
                                tailles
                              </strong>

                              <br />

                              <span
                                style={
                                  styles.muted
                                }
                              >
                                Principale :{' '}
                                {primaryVariant?.label ||
                                  buildSizeLabel(
                                    primaryVariant ||
                                      product
                                  )}
                              </span>
                            </>
                          ) : (
                            <span>
                              {primaryVariant?.label ||
                                buildSizeLabel(
                                  primaryVariant ||
                                    product
                                )}
                            </span>
                          )}
                        </td>

                        <td
                          style={
                            styles.td
                          }
                        >
                          {Number(
                            primaryVariant?.price ??
                              product.price ??
                              0
                          ).toFixed(
                            2
                          )}{' '}
                          DH
                        </td>

                        <td
                          style={
                            styles.td
                          }
                        >
                          {Number(
                            primaryVariant?.price_wholesale ??
                              product.price_wholesale ??
                              0
                          ).toFixed(
                            2
                          )}{' '}
                          DH
                        </td>

                        <td
                          style={
                            styles.td
                          }
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
                          style={
                            styles.td
                          }
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
                  }
                )}
              </tbody>
              </table>
            </div>

            <nav
              aria-label={t(
                'products.paginationLabel'
              )}
              style={
                styles.pagination
              }
            >
              <div
                style={
                  styles.paginationSummary
                }
              >
                {t(
                  'products.paginationSummary',
                  {
                    start:
                      Math.min(
                        (pagination.page -
                          1) *
                          pagination.pageSize +
                          1,
                        pagination.total
                      ),

                    end:
                      Math.min(
                        pagination.page *
                          pagination.pageSize,
                        pagination.total
                      ),

                    total:
                      pagination.total,
                  }
                )}
              </div>

              {pagination.pages >
                1 && (
                <div
                  style={
                    styles.paginationControls
                  }
                >
                  <button
                    type="button"
                    onClick={() =>
                      goToPage(
                        page - 1
                      )
                    }
                    disabled={
                      loading ||
                      page <= 1
                    }
                    style={{
                      ...styles.paginationButton,

                      ...(page <= 1
                        ? styles.paginationButtonDisabled
                        : {}),
                    }}
                    aria-label={t(
                      'products.previousPage'
                    )}
                  >
                    ‹
                  </button>

                  {getVisiblePages().map(
                    pageNumber => (
                      <button
                        key={
                          pageNumber
                        }
                        type="button"
                        onClick={() =>
                          goToPage(
                            pageNumber
                          )
                        }
                        disabled={
                          loading
                        }
                        aria-current={
                          pageNumber ===
                          page
                            ? 'page'
                            : undefined
                        }
                        style={{
                          ...styles.paginationButton,

                          ...(pageNumber ===
                          page
                            ? styles.paginationButtonActive
                            : {}),
                        }}
                      >
                        {
                          pageNumber
                        }
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      goToPage(
                        page + 1
                      )
                    }
                    disabled={
                      loading ||
                      page >=
                        pagination.pages
                    }
                    style={{
                      ...styles.paginationButton,

                      ...(page >=
                      pagination.pages
                        ? styles.paginationButtonDisabled
                        : {}),
                    }}
                    aria-label={t(
                      'products.nextPage'
                    )}
                  >
                    ›
                  </button>
                </div>
              )}
            </nav>
          </>
        )}
      </div>

      {isAdmin &&
        formOpen && (
          <div
            style={
              styles.modalOverlay
            }
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
              style={
                styles.modalDialog
              }
            >
              <form
                onSubmit={
                  saveProduct
                }
                style={
                  styles.modalForm
                }
              >
                <div
                  style={
                    styles.formHeader
                  }
                >
                  <div>
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

                    <p
                      style={
                        styles.modalSubtitle
                      }
                    >
                      Les prix, les
                      dimensions et les
                      stocks sont gérés
                      dans la section des
                      tailles.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      closeForm
                    }
                    disabled={
                      saving
                    }
                    style={
                      styles.ghostButton
                    }
                  >
                    {t(
                      'common.cancel'
                    )}
                  </button>
                </div>

                {error && (
                  <div
                    style={
                      styles.error
                    }
                  >
                    {error}
                  </div>
                )}

                <section
                  style={
                    styles.formSection
                  }
                >
                  <div
                    style={
                      styles.sectionHeading
                    }
                  >
                    <h2
                      style={
                        styles.sectionTitle
                      }
                    >
                      Informations générales
                    </h2>
                  </div>

                  <div
                    style={
                      styles.formGrid
                    }
                  >
                    <TextField
                      label={t(
                        'products.name'
                      )}
                      value={
                        form.name
                      }
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
                      value={
                        form.marque
                      }
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
                      value={
                        form.rubrique
                      }
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
                      value={
                        form.famille
                      }
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
                      value={
                        form.badge
                      }
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
                        'products.weightGrams'
                      )}
                      value={
                        form.weight
                      }
                      onChange={value =>
                        updateForm(
                          'weight',
                          value
                        )
                      }
                      min="0"
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
                </section>

                <section
                  style={
                    styles.formSection
                  }
                >
                  <div
                    style={
                      styles.sectionHeading
                    }
                  >
                    <h2
                      style={
                        styles.sectionTitle
                      }
                    >
                      Disponibilité et options
                    </h2>
                  </div>

                  <div
                    style={
                      styles.formGrid
                    }
                  >
                    <BooleanField
                      label="Disponible en plusieurs tailles"
                      value={
                        form.has_size_variants
                      }
                      onChange={value =>
                        updateForm(
                          'has_size_variants',
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
                  </div>

                  {form.has_color_variants && (
                    <MultiSelectField
                      label={t(
                        'products.colors'
                      )}
                      value={
                        form.colors
                      }
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
                </section>

                <section
                  style={
                    styles.sizeSection
                  }
                >
                  <div
                    style={
                      styles.sizeSectionHeader
                    }
                  >
                    <div>
                      <h2
                        style={
                          styles.sizeSectionTitle
                        }
                      >
                        Tailles, prix et stocks
                      </h2>

                      <p
                        style={
                          styles.sizeSectionDescription
                        }
                      >
                        {form.has_size_variants
                          ? 'La taille principale sera affichée par défaut sur le site. Le client pourra ensuite choisir une autre taille disponible.'
                          : 'Renseignez ici le prix, les dimensions et le stock du produit.'}
                      </p>
                    </div>

                    {form.has_size_variants && (
                      <button
                        type="button"
                        onClick={
                          addSizeVariant
                        }
                        style={
                          styles.addSizeButton
                        }
                      >
                        + Ajouter une taille
                      </button>
                    )}
                  </div>

                  <div
                    style={
                      styles.sizeCards
                    }
                  >
                    {form.size_variants.map(
                      (
                        variant,
                        index
                      ) => (
                        <article
                          key={
                            variant.id ||
                            `new-size-${index}`
                          }
                          style={{
                            ...styles.sizeCard,

                            ...(index ===
                            0
                              ? styles.primarySizeCard
                              : {}),
                          }}
                        >
                          <div
                            style={
                              styles.sizeCardHeader
                            }
                          >
                            <div
                              style={
                                styles.sizeCardHeading
                              }
                            >
                              <strong
                                style={
                                  styles.sizeCardTitle
                                }
                              >
                                {index ===
                                0
                                  ? 'Taille principale'
                                  : `Taille ${index + 1}`}
                              </strong>

                              {index ===
                                0 && (
                                <span
                                  style={
                                    styles.primarySizeBadge
                                  }
                                >
                                  Affichée par défaut
                                </span>
                              )}
                            </div>

                            {index > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  removeSizeVariant(
                                    index
                                  )
                                }
                                style={
                                  styles.removeSizeButton
                                }
                              >
                                Supprimer
                              </button>
                            )}
                          </div>

                          <div
                            style={
                              styles.sizeFieldsGrid
                            }
                          >
                            <TextField
                              label="Nom de la taille"
                              value={
                                variant.label
                              }
                              onChange={value =>
                                updateSizeVariant(
                                  index,
                                  'label',
                                  value
                                )
                              }
                              placeholder={
                                buildSizeLabel(
                                  variant
                                )
                              }
                            />

                            <NumberField
                              label="Largeur (cm)"
                              value={
                                variant.width_cm
                              }
                              onChange={value =>
                                updateSizeVariant(
                                  index,
                                  'width_cm',
                                  value
                                )
                              }
                              min="0"
                            />

                            <NumberField
                              label="Profondeur (cm)"
                              value={
                                variant.depth_cm
                              }
                              onChange={value =>
                                updateSizeVariant(
                                  index,
                                  'depth_cm',
                                  value
                                )
                              }
                              min="0"
                            />

                            <NumberField
                              label="Hauteur (cm)"
                              value={
                                variant.height_cm
                              }
                              onChange={value =>
                                updateSizeVariant(
                                  index,
                                  'height_cm',
                                  value
                                )
                              }
                              min="0"
                            />

                            <NumberField
                              label={t(
                                'products.retailPrice'
                              )}
                              value={
                                variant.price
                              }
                              onChange={value =>
                                updateSizeVariant(
                                  index,
                                  'price',
                                  value
                                )
                              }
                              required
                              min="0"
                            />

                            <NumberField
                              label={t(
                                'products.wholesalePrice'
                              )}
                              value={
                                variant.price_wholesale
                              }
                              onChange={value =>
                                updateSizeVariant(
                                  index,
                                  'price_wholesale',
                                  value
                                )
                              }
                              min="0"
                            />

                            <NumberField
                              label={t(
                                'products.wholesaleMinQty'
                              )}
                              value={
                                variant.wholesale_min_qty
                              }
                              onChange={value =>
                                updateSizeVariant(
                                  index,
                                  'wholesale_min_qty',
                                  value
                                )
                              }
                              min="1"
                              integer
                            />

                            <NumberField
                              label={t(
                                'products.globalStock'
                              )}
                              value={
                                variant.stock
                              }
                              onChange={value =>
                                updateSizeVariant(
                                  index,
                                  'stock',
                                  value
                                )
                              }
                              min="0"
                              integer
                            />

                            {index > 0 && (
                              <BooleanField
                                label="Taille disponible"
                                value={
                                  variant.is_active
                                }
                                onChange={value =>
                                  updateSizeVariant(
                                    index,
                                    'is_active',
                                    value
                                  )
                                }
                                trueLabel="Disponible"
                                falseLabel="Indisponible"
                              />
                            )}
                          </div>

                          {!String(
                            variant.label ||
                              ''
                          ).trim() && (
                            <div
                              style={
                                styles.generatedSizeLabel
                              }
                            >
                              Nom généré automatiquement :{' '}
                              <strong>
                                {buildSizeLabel(
                                  variant
                                )}
                              </strong>
                            </div>
                          )}
                        </article>
                      )
                    )}
                  </div>
                </section>

                <section
                  style={
                    styles.formSection
                  }
                >
                  <div
                    style={
                      styles.sectionHeading
                    }
                  >
                    <h2
                      style={
                        styles.sectionTitle
                      }
                    >
                      Images
                    </h2>
                  </div>

                  <div
                    style={
                      styles.imageGrid
                    }
                  >
                    {[1, 2, 3, 4, 5].map(
                      index => {
                        const field =
                          `url_image${index}`

                        return (
                          <div
                            key={
                              field
                            }
                            style={
                              styles.imageField
                            }
                          >
                            <div
                              style={
                                styles.imageFieldHeader
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

                              {form[field] && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateForm(
                                      field,
                                      ''
                                    )
                                  }
                                  disabled={
                                    saving
                                  }
                                  style={
                                    styles.removeImageButton
                                  }
                                >
                                  {t(
                                    'products.removeImage'
                                  )}
                                </button>
                              )}
                            </div>

                            <div
                              style={
                                styles.imagePreview
                              }
                            >
                              {form[field] ? (
                                <img
                                  src={
                                    form[field]
                                  }
                                  alt={`${form.name || t(
                                    'products.product'
                                  )} - ${t(
                                    'products.image'
                                  )} ${index}`}
                                  loading="lazy"
                                  decoding="async"
                                  style={
                                    styles.imagePreviewPicture
                                  }
                                />
                              ) : (
                                <div
                                  style={
                                    styles.imagePreviewEmpty
                                  }
                                >
                                  {t(
                                    'products.noImage'
                                  )}
                                </div>
                              )}
                            </div>

                            <label
                              style={
                                styles.imageUploadButton
                              }
                            >
                              <span>
                                {form[field]
                                  ? t(
                                      'products.replaceImage'
                                    )
                                  : t(
                                      'products.addImage'
                                    )}
                              </span>

                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/avif"
                                onChange={event =>
                                  uploadImage(
                                    event,
                                    field
                                  )
                                }
                                disabled={
                                  saving
                                }
                                style={
                                  styles.hiddenFileInput
                                }
                              />
                            </label>

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
                          </div>
                        )
                      }
                    )}
                  </div>
                </section>

                <section
                  style={
                    styles.formSection
                  }
                >
                  <div
                    style={
                      styles.sectionHeading
                    }
                  >
                    <h2
                      style={
                        styles.sectionTitle
                      }
                    >
                      Description et entretien
                    </h2>
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
                </section>

                <section
                  style={
                    styles.formSection
                  }
                >
                  <div
                    style={
                      styles.sectionHeading
                    }
                  >
                    <h2
                      style={
                        styles.sectionTitle
                      }
                    >
                      Référencement
                    </h2>

                    <p
                      style={
                        styles.sectionDescription
                      }
                    >
                      Le prix et les
                      dimensions de la
                      taille principale
                      seront utilisés pour
                      les données produit
                      par défaut.
                    </p>
                  </div>

                  <TextField
                    wide
                    label={t(
                      'products.seoTitle'
                    )}
                    value={
                      form.seo_title
                    }
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
                </section>

                <div
                  style={
                    styles.modalActions
                  }
                >
                  <button
                    type="button"
                    onClick={
                      closeForm
                    }
                    disabled={
                      saving
                    }
                    style={
                      styles.ghostButton
                    }
                  >
                    {t(
                      'common.cancel'
                    )}
                  </button>

                  <button
                    type="submit"
                    disabled={
                      saving
                    }
                    style={{
                      ...styles.primaryButton,

                      ...(saving
                        ? styles.disabledButton
                        : {}),
                    }}
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

function ProductThumbnail({
  src,
  alt,
}) {
  const [
    imageError,
    setImageError,
  ] = useState(false)

  useEffect(() => {
    setImageError(false)
  }, [src])

  if (
    !src ||
    imageError
  ) {
    return (
      <div
        style={
          styles.productThumbnailFallback
        }
        role="img"
        aria-label={
          alt
            ? `Aucune image disponible pour ${alt}`
            : 'Aucune image disponible'
        }
      >
        <span aria-hidden="true">
          ◻
        </span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt || ''}
      loading="lazy"
      decoding="async"
      onError={() =>
        setImageError(true)
      }
      style={
        styles.productThumbnail
      }
    />
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
          item =>
            item !== option
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
    <div
      style={
        styles.fieldWide
      }
    >
      <span style={styles.label}>
        {label}
      </span>

      <div
        style={
          styles.choiceGrid
        }
      >
        {options.map(option => {
          const selected =
            Array.isArray(
              value
            ) &&
            value.includes(
              option
            )

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
  placeholder = '',
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
        placeholder={
          placeholder
        }
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
  integer = false,
}) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>
        {label}
      </span>

      <input
        type="number"
        step={
          integer ? '1' : 'any'
        }
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
      style={
        styles.fieldWide
      }
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
        style={
          styles.textarea
        }
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
          value
            ? 'true'
            : 'false'
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
    alignItems:
      'flex-start',
    marginBottom: 18,
    flexWrap: 'wrap',
  },

  title: {
    fontSize: 28,
    margin: 0,
    letterSpacing:
      '-0.04em',
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

  disabledButton: {
    opacity: 0.6,
    cursor: 'not-allowed',
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

  productIdentity: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    minWidth: 210,
  },

  productIdentityText: {
    display: 'grid',
    gap: 4,
    minWidth: 0,
  },

  productName: {
    display: '-webkit-box',
    overflow: 'hidden',
    WebkitBoxOrient:
      'vertical',
    WebkitLineClamp: 2,
    lineHeight: 1.35,
  },

  productThumbnail: {
    width: 58,
    height: 58,
    flex: '0 0 58px',
    display: 'block',
    borderRadius: 12,
    border:
      '1px solid #eee6dc',
    background: '#f7f3ed',
    objectFit: 'contain',
  },

  productThumbnailFallback: {
    width: 58,
    height: 58,
    flex: '0 0 58px',
    display: 'grid',
    placeItems: 'center',
    borderRadius: 12,
    border:
      '1px dashed #d8cfc3',
    background: '#f7f3ed',
    color: '#a69a8c',
    fontSize: 20,
  },  

  table: {
    width: '100%',
    borderCollapse:
      'collapse',
    minWidth: 1040,
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

  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      'space-between',
    gap: 14,
    flexWrap: 'wrap',
    paddingTop: 14,
    marginTop: 4,
    borderTop:
      '1px solid #eee6dc',
  },

  paginationSummary: {
    color: '#8a7f72',
    fontSize: 12,
  },

  paginationControls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      'center',
    gap: 6,
    flexWrap: 'wrap',
  },

  paginationButton: {
    width: 40,
    height: 40,
    display: 'grid',
    placeItems: 'center',
    border:
      '1px solid #e6ded2',
    borderRadius: 12,
    background: '#fff',
    color: '#1f1a14',
    fontSize: 13,
    fontWeight: 900,
    cursor: 'pointer',
  },

  paginationButtonActive: {
    borderColor: '#1f1a14',
    background: '#1f1a14',
    color: '#fff',
  },

  paginationButtonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },  

  modalOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 3000,
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      'center',
    padding: 16,
    boxSizing:
      'border-box',
    background:
      'rgba(31, 26, 20, 0.62)',
    backdropFilter:
      'blur(4px)',
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
    boxSizing:
      'border-box',
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
    margin:
      '-18px -18px 0',
    padding: 18,
    background: '#fff',
    borderBottom:
      '1px solid #eee6dc',
  },

  modalTitle: {
    fontSize: 20,
  },

  modalSubtitle: {
    margin: '5px 0 0',
    fontSize: 12,
    lineHeight: 1.5,
    color: '#8a7f72',
  },

  formSection: {
    display: 'grid',
    gap: 14,
    padding: 16,
    border:
      '1px solid #eee6dc',
    borderRadius: 20,
    background: '#fff',
  },

  sectionHeading: {
    display: 'grid',
    gap: 4,
  },

  sectionTitle: {
    margin: 0,
    fontSize: 17,
    color: '#1f1a14',
  },

  sectionDescription: {
    margin: 0,
    fontSize: 12,
    lineHeight: 1.5,
    color: '#8a7f72',
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

  imageField: {
    display: 'grid',
    gap: 10,
    minWidth: 0,
    padding: 12,
    border:
      '1px solid #eee6dc',
    borderRadius: 18,
    background: '#faf8f5',
  },

  imageFieldHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      'space-between',
    gap: 10,
  },

  imagePreview: {
    width: '100%',
    aspectRatio: '4 / 3',
    overflow: 'hidden',
    borderRadius: 14,
    border:
      '1px solid #e6ded2',
    background: '#fff',
  },

  imagePreviewPicture: {
    width: '100%',
    height: '100%',
    display: 'block',
    objectFit: 'contain',
  },

  imagePreviewEmpty: {
    width: '100%',
    height: '100%',
    minHeight: 150,
    display: 'grid',
    placeItems: 'center',
    padding: 16,
    boxSizing:
      'border-box',
    color: '#8a7f72',
    fontSize: 12,
    textAlign: 'center',
  },

  imageUploadButton: {
    minHeight: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      'center',
    border:
      '1px dashed #cbbfaf',
    borderRadius: 14,
    background: '#fff',
    color: '#1f1a14',
    padding: '10px 12px',
    boxSizing:
      'border-box',
    fontSize: 12,
    fontWeight: 900,
    cursor: 'pointer',
    textAlign: 'center',
  },

  hiddenFileInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
    clip:
      'rect(0 0 0 0)',
    whiteSpace: 'nowrap',
    clipPath:
      'inset(50%)',
  },

  removeImageButton: {
    border: 'none',
    background:
      'transparent',
    color: '#c0392b',
    padding: 0,
    fontSize: 11,
    fontWeight: 900,
    cursor: 'pointer',
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
    boxSizing:
      'border-box',
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
    boxSizing:
      'border-box',
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
    boxSizing:
      'border-box',
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

  sizeSection: {
    display: 'grid',
    gap: 14,
    padding: 16,
    border:
      '1px solid #d9cdbd',
    borderRadius: 20,
    background: '#faf8f5',
  },

  sizeSectionHeader: {
    display: 'flex',
    alignItems:
      'flex-start',
    justifyContent:
      'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },

  sizeSectionTitle: {
    margin: 0,
    fontSize: 17,
    color: '#1f1a14',
  },

  sizeSectionDescription: {
    margin: '5px 0 0',
    color: '#8a7f72',
    fontSize: 12,
    lineHeight: 1.5,
    maxWidth: 720,
  },

  addSizeButton: {
    border: 'none',
    borderRadius: 999,
    background: '#1f1a14',
    color: '#fff',
    padding: '10px 14px',
    fontSize: 12,
    fontWeight: 900,
    cursor: 'pointer',
  },

  sizeCards: {
    display: 'grid',
    gap: 12,
  },

  sizeCard: {
    display: 'grid',
    gap: 14,
    padding: 14,
    border:
      '1px solid #e6ded2',
    borderRadius: 18,
    background: '#fff',
  },

  primarySizeCard: {
    border:
      '2px solid #1f1a14',
  },

  sizeCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },

  sizeCardHeading: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },

  sizeCardTitle: {
    fontSize: 14,
    color: '#1f1a14',
  },

  primarySizeBadge: {
    display:
      'inline-flex',
    padding: '4px 8px',
    borderRadius: 999,
    background: '#1f1a14',
    color: '#fff',
    fontSize: 10,
    fontWeight: 900,
  },

  removeSizeButton: {
    border:
      '1px solid #ffd0d0',
    borderRadius: 999,
    background: '#fff0f0',
    color: '#c0392b',
    padding: '8px 11px',
    fontSize: 11,
    fontWeight: 900,
    cursor: 'pointer',
  },

  sizeFieldsGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(155px, 1fr))',
    gap: 12,
  },

  generatedSizeLabel: {
    padding: '10px 12px',
    borderRadius: 12,
    background: '#f7f3ed',
    color: '#6f665c',
    fontSize: 12,
  },

  modalActions: {
    position: 'sticky',
    bottom: -18,
    zIndex: 5,
    display: 'flex',
    justifyContent:
      'flex-end',
    gap: 10,
    flexWrap: 'wrap',
    margin:
      '0 -18px -18px',
    padding: 18,
    background: '#fff',
    borderTop:
      '1px solid #eee6dc',
  },
}