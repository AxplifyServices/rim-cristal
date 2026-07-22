import HomePage from '../src/site/pages/HomePage'
import {
  getHomepageBrochures,
} from '../src/site/lib/homepageBrochures'
import {
  getProductsPage,
} from '../src/site/lib/products'

const HOME_PRODUCTS_PAGE_SIZE = 6

export const revalidate = 60

export default async function Page() {
  const [
    brochuresResult,
    bestsellersResult,
    promotionsResult,
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
      : {
          items: [],
          total: 0,
          page: 1,
          pageSize:
            HOME_PRODUCTS_PAGE_SIZE,
          pages: 1,
        }

  const initialPromotions =
    promotionsResult.status ===
    'fulfilled'
      ? promotionsResult.value
      : {
          items: [],
          total: 0,
          page: 1,
          pageSize:
            HOME_PRODUCTS_PAGE_SIZE,
          pages: 1,
        }

  const brochuresLoadFailed =
    brochuresResult.status ===
    'rejected'

  const bestsellersLoadFailed =
    bestsellersResult.status ===
    'rejected'

  const promotionsLoadFailed =
    promotionsResult.status ===
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
      brochuresLoadFailed={
        brochuresLoadFailed
      }
      bestsellersLoadFailed={
        bestsellersLoadFailed
      }
      promotionsLoadFailed={
        promotionsLoadFailed
      }
    />
  )
}