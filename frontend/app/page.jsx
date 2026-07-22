import HomePage from '../src/site/pages/HomePage'
import {
  getHomepageBrochures,
} from '../src/site/lib/homepageBrochures'
import {
  getProductsPage,
} from '../src/site/lib/products'

const HOME_PRODUCTS_PAGE_SIZE = 6

export const revalidate = 60

function createEmptyProductsResult() {
  return {
    items: [],
    total: 0,
    page: 1,
    pageSize:
      HOME_PRODUCTS_PAGE_SIZE,
    pages: 1,
  }
}

export default async function Page() {
  const [
    brochuresResult,
    bestsellersResult,
    promotionsResult,
    recentProductsResult,
  ] = await Promise.allSettled([
    getHomepageBrochures(),

    getProductsPage({
      page: 1,
      pageSize:
        HOME_PRODUCTS_PAGE_SIZE,
      bestseller: true,
    }),

    getProductsPage({
      page: 1,
      pageSize:
        HOME_PRODUCTS_PAGE_SIZE,
      promotion: true,
    }),

    /*
     * Le backend limite automatiquement
     * cette requête aux 18 produits les
     * plus récemment créés.
     */
    getProductsPage({
      page: 1,
      pageSize:
        HOME_PRODUCTS_PAGE_SIZE,
      recent: true,
    }),
  ])

  const initialBrochures =
    brochuresResult.status ===
    'fulfilled'
      ? brochuresResult.value
      : []

  const initialBestsellers =
    bestsellersResult.status ===
    'fulfilled'
      ? bestsellersResult.value
      : createEmptyProductsResult()

  const initialPromotions =
    promotionsResult.status ===
    'fulfilled'
      ? promotionsResult.value
      : createEmptyProductsResult()

  const initialRecentProducts =
    recentProductsResult.status ===
    'fulfilled'
      ? recentProductsResult.value
      : createEmptyProductsResult()

  const brochuresLoadFailed =
    brochuresResult.status ===
    'rejected'

  const bestsellersLoadFailed =
    bestsellersResult.status ===
    'rejected'

  const promotionsLoadFailed =
    promotionsResult.status ===
    'rejected'

  const recentProductsLoadFailed =
    recentProductsResult.status ===
    'rejected'

  if (brochuresLoadFailed) {
    console.error(
      'Erreur de chargement des brochures :',
      brochuresResult.reason
    )
  }

  if (bestsellersLoadFailed) {
    console.error(
      'Erreur de chargement des best sellers :',
      bestsellersResult.reason
    )
  }

  if (promotionsLoadFailed) {
    console.error(
      'Erreur de chargement des promotions :',
      promotionsResult.reason
    )
  }

  if (
    recentProductsLoadFailed
  ) {
    console.error(
      'Erreur de chargement des nouveautés :',
      recentProductsResult.reason
    )
  }

  return (
    <HomePage
      initialBrochures={
        initialBrochures
      }
      initialBestsellers={
        initialBestsellers
      }
      initialPromotions={
        initialPromotions
      }
      initialRecentProducts={
        initialRecentProducts
      }
      brochuresLoadFailed={
        brochuresLoadFailed
      }
      bestsellersLoadFailed={
        bestsellersLoadFailed
      }
      promotionsLoadFailed={
        promotionsLoadFailed
      }
      recentProductsLoadFailed={
        recentProductsLoadFailed
      }
    />
  )
}