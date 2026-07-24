import { Suspense } from 'react'

import ShopPage from '../../src/site/pages/ShopPage'

import {
  getProductFilters,
  getProductsPage,
} from '../../src/site/lib/products'

import {
  PRODUCT_SECTION_VALUES,
} from '../../src/site/constants/productSections'

const PRODUCTS_PER_PAGE = 10

export const metadata = {
  title: 'Boutique',
  description:
    'Découvrez une sélection de mobilier, luminaires et objets de décoration pensés pour transformer chaque intérieur en un lieu qui raconte votre histoire.',
}

export const revalidate = 60

function normalizeList(value) {
  const values = Array.isArray(value)
    ? value
    : value
      ? [value]
      : []

  return values
    .map(item =>
      String(item).trim()
    )
    .filter(Boolean)
}

function normalizePositiveInteger(
  value,
  fallback = 1
) {
  const parsedValue = Number(value)

  return Number.isInteger(
    parsedValue
  ) && parsedValue > 0
    ? parsedValue
    : fallback
}

function createEmptyProductsResult(
  page
) {
  return {
    items: [],
    total: 0,
    page,
    pageSize:
      PRODUCTS_PER_PAGE,
    pages: 1,
  }
}

function createEmptyFiltersResult() {
  return {
    rubriques:
      PRODUCT_SECTION_VALUES,
    categories: [],
    families: [],
    price: {
      min: 0,
      max: 0,
    },
  }
}

export default async function Page({
  searchParams,
}) {
  const resolvedSearchParams =
    await searchParams

  const selectedRubriques =
    normalizeList(
      resolvedSearchParams?.rubrique
    ).filter(value =>
      PRODUCT_SECTION_VALUES.includes(
        value
      )
    )

  const selectedCategories =
    normalizeList(
      resolvedSearchParams?.categorie
    )

  const selectedFamilies =
    normalizeList(
      resolvedSearchParams?.famille
    )

  const currentPage =
    normalizePositiveInteger(
      resolvedSearchParams?.page,
      1
    )

  const search = String(
    resolvedSearchParams?.search || ''
  ).trim()

  const minPrice =
    resolvedSearchParams?.prix_min ??
    undefined

  const maxPrice =
    resolvedSearchParams?.prix_max ??
    undefined

  const [
    productsResult,
    filtersResult,
  ] = await Promise.allSettled([
    getProductsPage({
      page: currentPage,
      pageSize:
        PRODUCTS_PER_PAGE,
      rubrique:
        selectedRubriques,
      categorie:
        selectedCategories,
      famille:
        selectedFamilies,
      minPrice,
      maxPrice,
      search,
    }),

    getProductFilters({
      rubrique:
        selectedRubriques,
      categorie:
        selectedCategories,
    }),
  ])

  const productsLoadFailed =
    productsResult.status ===
    'rejected'

  const filtersLoadFailed =
    filtersResult.status ===
    'rejected'

  if (productsLoadFailed) {
    console.error(
      'Erreur serveur lors du chargement des produits :',
      productsResult.reason
    )
  }

  if (filtersLoadFailed) {
    console.error(
      'Erreur serveur lors du chargement des filtres :',
      filtersResult.reason
    )
  }

  const initialProductsResult =
    productsLoadFailed
      ? createEmptyProductsResult(
          currentPage
        )
      : productsResult.value

  const initialFiltersResult =
    filtersLoadFailed
      ? createEmptyFiltersResult()
      : filtersResult.value

  return (
    <Suspense
      fallback={
        <div
          className="shop-route-loading"
          aria-busy="true"
          aria-live="polite"
        >
          Chargement de la boutique…
        </div>
      }
    >
      <ShopPage
        initialProductsResult={
          initialProductsResult
        }
        initialFiltersResult={
          initialFiltersResult
        }
        initialLoadError={
          productsLoadFailed
        }
      />
    </Suspense>
  )
}