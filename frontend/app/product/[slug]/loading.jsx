import SiteLayout from '../../../src/site/components/SiteLayout'

export default function ProductLoading() {
  return (
    <SiteLayout>
      <main
        className="product-route-skeleton"
        aria-busy="true"
        aria-live="polite"
        aria-label="Chargement du produit"
      >
        <div className="container">
          <div className="product-route-skeleton-breadcrumb">
            <span />
            <span />
            <span />
          </div>

          <div className="product-route-skeleton-layout">
            <section className="product-route-skeleton-gallery">
              <div className="product-route-skeleton-image" />

              <div className="product-route-skeleton-thumbnails">
                {Array.from(
                  {
                    length: 4,
                  },
                  (_, index) => (
                    <span
                      key={index}
                    />
                  )
                )}
              </div>
            </section>

            <section className="product-route-skeleton-content">
              <span className="product-route-skeleton-kicker" />
              <span className="product-route-skeleton-name" />
              <span className="product-route-skeleton-reference" />
              <span className="product-route-skeleton-price" />

              <div className="product-route-skeleton-lines">
                <span />
                <span />
                <span />
              </div>

              <span className="product-route-skeleton-selector" />
              <span className="product-route-skeleton-button" />
            </section>
          </div>
        </div>
      </main>
    </SiteLayout>
  )
}