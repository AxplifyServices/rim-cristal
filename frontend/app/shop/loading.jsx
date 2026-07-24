export default function ShopLoading() {
  return (
    <main
      className="shop-route-skeleton"
      aria-busy="true"
      aria-live="polite"
      aria-label="Chargement de la boutique"
    >
      <section className="shop-route-skeleton-header">
        <div className="container">
          <span className="shop-route-skeleton-title" />
          <span className="shop-route-skeleton-subtitle" />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="shop-route-skeleton-toolbar">
            <span />
            <span />
          </div>

          <div className="shop-route-skeleton-layout">
            <aside className="shop-route-skeleton-filters">
              {Array.from(
                {
                  length: 5,
                },
                (_, index) => (
                  <span key={index} />
                )
              )}
            </aside>

            <div className="shop-route-skeleton-grid">
              {Array.from(
                {
                  length: 8,
                },
                (_, index) => (
                  <article
                    key={index}
                    className="shop-card-skeleton"
                  >
                    <span />
                    <span />
                    <span />
                  </article>
                )
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}