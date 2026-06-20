import ProductPage from '../../../src/site/pages/ProductPage'

export default async function Page({ params }) {
  const { slug } = await params

  return <ProductPage slug={slug} />
}