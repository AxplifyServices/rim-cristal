import {
  notFound,
} from 'next/navigation'

import ProductPage from '../../../src/site/pages/ProductPage'

import {
  getProductBySlug,
} from '../../../src/site/lib/products'

export const revalidate = 60

export async function generateMetadata({
  params,
}) {
  const { slug } = await params

  try {
    const product =
      await getProductBySlug(slug)

    if (!product) {
      return {
        title:
          'Produit introuvable',
        description:
          'Ce produit n’est plus disponible dans notre boutique.',
      }
    }

    const productName =
      String(
        product.name || ''
      ).trim()

    const category =
      product.famille ||
      product.categorie ||
      product.rubrique ||
      'décoration intérieure'

    const description =
      String(
        product.description || ''
      ).trim()

    const fallbackDescription =
      `Découvrez ${productName}, une pièce de ${category} pensée pour donner du caractère à votre intérieur et accompagner les moments qui font l’histoire de votre maison.`

    return {
      title: productName,

      description:
        description ||
        fallbackDescription,

      alternates: {
        canonical:
          `/product/${encodeURIComponent(
            slug
          )}`,
      },

      openGraph: {
        title: productName,

        description:
          description ||
          fallbackDescription,

        type: 'website',

        images:
          product.image
            ? [
                {
                  url: product.image,
                  alt: productName,
                },
              ]
            : [],
      },
    }
  } catch (error) {
    console.error(
      'Erreur génération metadata produit :',
      error
    )

    return {
      title: 'Produit',
      description:
        'Découvrez notre sélection de mobilier, luminaires et décoration intérieure.',
    }
  }
}

export default async function Page({
  params,
}) {
  const { slug } = await params

  let product

  try {
    product =
      await getProductBySlug(slug)
  } catch (error) {
    console.error(
      'Erreur chargement page produit :',
      error
    )

    throw error
  }

  if (!product) {
    notFound()
  }

  return (
    <ProductPage
      slug={slug}
      initialProduct={product}
    />
  )
}