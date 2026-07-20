import HomePage from '../src/site/pages/HomePage'
import {
  getHomepageBrochures,
} from '../src/site/lib/homepageBrochures'
import {
  getProductsPage,
} from '../src/site/lib/products'

const BESTSELLERS_LIMIT = 8

export const revalidate = 60

export default async function Page() {
  const [
    brochuresResult,
    productsResult,
  ] = await Promise.allSettled([
    getHomepageBrochures(),

    getProductsPage({
      page: 1,
      pageSize:
        BESTSELLERS_LIMIT,
      bestseller: true,
    }),
  ])

  const initialBrochures =
    brochuresResult.status ===
    'fulfilled'
      ? brochuresResult.value
      : []

  const initialBestsellers =
    productsResult.status ===
    'fulfilled'
      ? productsResult.value
          ?.items || []
      : []

  const brochuresLoadFailed =
    brochuresResult.status ===
    'rejected'

  const productsLoadFailed =
    productsResult.status ===
    'rejected'

  if (brochuresLoadFailed) {
    console.error(
      'Erreur de chargement des brochures :',
      brochuresResult.reason
    )
  }

  if (productsLoadFailed) {
    console.error(
      'Erreur de chargement des best-sellers :',
      productsResult.reason
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
      brochuresLoadFailed={
        brochuresLoadFailed
      }
      productsLoadFailed={
        productsLoadFailed
      }
    />
  )
}