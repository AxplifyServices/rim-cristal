import HomePage from '../src/site/pages/HomePage'

import {
  getHomepageBrochures,
} from '../src/site/lib/homepageBrochures'

import {
  getProductsPage,
} from '../src/site/lib/products'

import {
  getHomeReviews,
} from '../src/site/lib/reviews'

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
    reviewsResult,
  ] = await Promise.allSettled([
    /*
     * Brochures de la page d'accueil.
     */
    getHomepageBrochures(),

    /*
     * Best sellers :
     * 6 produits par page.
     */
    getProductsPage({
      page: 1,
      pageSize:
        HOME_PRODUCTS_PAGE_SIZE,
      bestseller: true,
    }),

    /*
     * Produits avec une promotion active :
     * 6 produits par page.
     */
    getProductsPage({
      page: 1,
      pageSize:
        HOME_PRODUCTS_PAGE_SIZE,
      promotion: true,
    }),

    /*
     * Nouveautés :
     * le backend limite cette sélection
     * aux 18 produits les plus récents.
     */
    getProductsPage({
      page: 1,
      pageSize:
        HOME_PRODUCTS_PAGE_SIZE,
      recent: true,
    }),

    /*
     * Avis approuvés et sélectionnés
     * par l'administrateur pour la home.
     */
    getHomeReviews(),
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

  const initialReviews =
    reviewsResult.status ===
    'fulfilled'
      ? reviewsResult.value
      : []

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

  const reviewsLoadFailed =
    reviewsResult.status ===
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

  if (reviewsLoadFailed) {
    console.error(
      'Erreur de chargement des avis clients :',
      reviewsResult.reason
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
      initialReviews={
        initialReviews
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