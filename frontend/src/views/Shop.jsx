'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ProductCard from '../components/ProductCard'
import { fetchProducts, mapProduct } from '../lib/products'

const PAGE_SIZE = 24

const SIZES = ['standard']

const COLORS = [
  'black',
  'gold',
  'white',
  'silver',
  'brown',
  'copper',
  'grey',
  'blue',
  'green',
]

const CATEGORY_CONFIG = {
  suspension: {
    label: 'Suspensions',
    api: { categorie: 'suspension' },
  },
  applique: {
    label: 'Appliques',
    api: { categorie: 'applique' },
  },
  plafonnier: {
    label: 'Plafonniers',
    api: { categorie: 'plafonnier' },
  },
  'lampe-de-table': {
    label: 'Lampes de table',
    api: { categorie: 'lampe de table' },
  },
  spot: {
    label: 'Spots',
    api: { categorie: 'spot' },
  },
  lampadaire: {
    label: 'Lampadaires',
    api: { categorie: 'lampadaire' },
  },
  led: {
    label: 'Ampoules LED',
    api: { categorie: 'led' },
  },
  exterieur: {
    label: 'Éclairage extérieur',
    api: { rubrique: "éclairage d'extérieur" },
  },
}

const SORT_OPTIONS = [
  'Pertinence',
  'Prix croissant',
  'Prix décroissant',
  'Nouveautés',
  'Meilleures ventes',
]

const DEFAULT_FILTERS = {
  priceMin: 0,
  priceMax: 10000,
  colors: [],
  sizes: [],
}

function toggle(arr, val) {
  return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
}

function countActiveFilters(filters) {
  let count = 0

  if (filters.priceMin !== DEFAULT_FILTERS.priceMin) count += 1
  if (filters.priceMax !== DEFAULT_FILTERS.priceMax) count += 1

  count += filters.colors.length
  count += filters.sizes.length

  return count
}

function SkeletonCard() {
  return (
    <div style={{ borderRadius: 8, overflow: 'hidden', background: '#f5f3f0' }}>
      <div style={{ paddingBottom: '120%', background: '#e8e3dc', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ padding: '14px 16px' }}>
        <div style={{ height: 12, background: '#e8e3dc', borderRadius: 4, width: '50%', marginBottom: 8 }} />
        <div style={{ height: 16, background: '#e8e3dc', borderRadius: 4, width: '80%', marginBottom: 8 }} />
        <div style={{ height: 14, background: '#e8e3dc', borderRadius: 4, width: '40%' }} />
      </div>
    </div>
  )
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5h16l-6.2 7.2v4.7l-3.6 2V12.2L4 5Z" />
    </svg>
  )
}

function Sidebar({ filters, onChange, onReset }) {
  return (
    <aside className="sidebar">
      <div className="sb-block">
        <div className="sb-title">Prix</div>

        <div className="price-disp">
          <span>
            De <b>{filters.priceMin} MAD</b>
          </span>
          <span>
            À <b>{filters.priceMax} MAD</b>
          </span>
        </div>

        <div className="slider-track">
          <div
            className="slider-fill"
            style={{
              left: `${(filters.priceMin / 10000) * 100}%`,
              right: `${100 - (filters.priceMax / 10000) * 100}%`,
            }}
          />

          <input
            type="range"
            min="0"
            max="10000"
            step="100"
            value={filters.priceMin}
            onChange={e => onChange('priceMin', Math.min(+e.target.value, filters.priceMax - 100))}
          />

          <input
            type="range"
            min="0"
            max="10000"
            step="100"
            value={filters.priceMax}
            onChange={e => onChange('priceMax', Math.max(+e.target.value, filters.priceMin + 100))}
          />
        </div>
      </div>

      <div className="sb-block">
        <div className="sb-title">Couleur</div>

        <div className="swatches">
          {COLORS.map(c => (
            <button
              key={c}
              type="button"
              className={`swatch${filters.colors.includes(c) ? ' on' : ''}`}
              data-c={c}
              title={c}
              aria-label={c}
              onClick={() => onChange('colors', c)}
            />
          ))}
        </div>
      </div>

      <div className="sb-block">
        <div className="sb-title">Taille</div>

        <div className="chk-list">
          {SIZES.map(s => (
            <button
              key={s}
              type="button"
              className={`chk-row${filters.sizes.includes(s) ? ' on' : ''}`}
              onClick={() => onChange('sizes', s)}
            >
              <span className="chk-box" />
              <span style={{ textTransform: 'capitalize' }}>{s}</span>
            </button>
          ))}
        </div>
      </div>

      <button className="btn btn-ghost btn-full" style={{ marginTop: 22 }} onClick={onReset}>
        Réinitialiser les filtres
      </button>
    </aside>
  )
}

function FilterDrawer({
  open,
  filters,
  activeFiltersCount,
  onClose,
  onChange,
  onReset,
}) {
  useEffect(() => {
    if (!open) return

    const onKeyDown = event => {
      if (event.key === 'Escape') onClose()
    }

    document.body.classList.add('filter-drawer-open')
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.classList.remove('filter-drawer-open')
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  return (
    <>
      <div
        className={`filter-backdrop${open ? ' open' : ''}`}
        onClick={onClose}
      />

      <div
        className={`filter-drawer${open ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Filtres produits"
      >
        <div className="filter-drawer-head">
          <div>
            <p>Filtres</p>
            <span>
              {activeFiltersCount > 0
                ? `${activeFiltersCount} filtre${activeFiltersCount > 1 ? 's' : ''} actif${activeFiltersCount > 1 ? 's' : ''}`
                : 'Affiner la sélection'}
            </span>
          </div>

          <button
            type="button"
            className="filter-close"
            aria-label="Fermer les filtres"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="filter-drawer-body">
          <Sidebar filters={filters} onChange={onChange} onReset={onReset} />
        </div>

        <div className="filter-drawer-footer">
          <button type="button" className="btn btn-ghost" onClick={onReset}>
            Réinitialiser
          </button>

          <button type="button" className="btn btn-dark" onClick={onClose}>
            Appliquer
          </button>
        </div>
      </div>
    </>
  )
}

export default function Shop() {
  const params = useParams()
  const searchParams = useSearchParams()

  const categorySlug = params?.category ? decodeURIComponent(params.category) : ''
  const categoryConfig = categorySlug ? CATEGORY_CONFIG[categorySlug] : null

  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    page_size: PAGE_SIZE,
    pages: 1,
  })
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('Pertinence')
  const [filters, setFil] = useState(DEFAULT_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [page, setPage] = useState(1)

  const catLabel = categoryConfig?.label || 'Tous les luminaires'
  const activeFiltersCount = countActiveFilters(filters)

  useEffect(() => {
    setPage(1)
    setFil(DEFAULT_FILTERS)
  }, [categorySlug, searchParams])

  useEffect(() => {
    setLoading(true)

    const apiParams = {
      page,
      page_size: PAGE_SIZE,
    }

    if (categoryConfig?.api) {
      Object.assign(apiParams, categoryConfig.api)
    }

    const q = searchParams.get('q')
    if (q) {
      apiParams.q = q
    }

    const filterQ = searchParams.get('filter')
    if (filterQ === 'new') {
      apiParams.new = true
    }

    if (filterQ === 'sale') {
      apiParams.sale = true
    }

    fetchProducts(apiParams)
      .then(data => {
        setProducts((data.items || []).map(mapProduct).filter(Boolean))
        setPagination({
          total: data.total || 0,
          page: data.page || page,
          page_size: data.page_size || PAGE_SIZE,
          pages: data.pages || 1,
        })
      })
      .catch(() => {
        setProducts([])
        setPagination({
          total: 0,
          page: 1,
          page_size: PAGE_SIZE,
          pages: 1,
        })
      })
      .finally(() => setLoading(false))
  }, [categorySlug, categoryConfig, page, searchParams])

  const onChange = (key, val) => {
    if (key === 'priceMin' || key === 'priceMax') {
      setFil(f => ({ ...f, [key]: val }))
      return
    }

    setFil(f => ({ ...f, [key]: toggle(f[key], val) }))
  }

  const onResetFilters = () => {
    setFil(DEFAULT_FILTERS)
  }

  const filteredSorted = useMemo(() => {
    let list = [...products]

    list = list.filter(p => (
      p.salePrice >= filters.priceMin &&
      p.salePrice <= filters.priceMax &&
      (filters.colors.length === 0 || p.colors.some(c => filters.colors.includes(c))) &&
      (filters.sizes.length === 0 || p.sizes.some(s => filters.sizes.includes(s)))
    ))

    switch (sort) {
      case 'Prix croissant':
        list.sort((a, b) => a.salePrice - b.salePrice)
        break
      case 'Prix décroissant':
        list.sort((a, b) => b.salePrice - a.salePrice)
        break
      case 'Nouveautés':
        list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0))
        break
      case 'Meilleures ventes':
        list.sort((a, b) => (b.bestSeller ? 1 : 0) - (a.bestSeller ? 1 : 0))
        break
      default:
        list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
    }

    return list
  }, [products, filters, sort])

  const canGoPrev = page > 1
  const canGoNext = page < pagination.pages

  return (
    <>
      <div className="shop-hero">
        <div className="page-wrap">
          <div className="shop-breadcrumb">
            <Link href="/">Accueil</Link>
            <span className="breadcrumb-sep">›</span>
            <span>Boutique</span>
            {categorySlug && (
              <>
                <span className="breadcrumb-sep">›</span>
                <span>{catLabel}</span>
              </>
            )}
          </div>

          <h1>{catLabel}</h1>
          <p>
            {loading
              ? 'Chargement…'
              : `${pagination.total} produit${pagination.total > 1 ? 's' : ''} disponible${pagination.total > 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      <div className="page-wrap">
        <div className="shop-layout shop-layout-no-sidebar">
          <section>
            <div className="prod-bar">
              <div className="prod-bar-left">
                <button
                  type="button"
                  className="filter-trigger"
                  onClick={() => setFiltersOpen(true)}
                >
                  <FilterIcon />
                  <span>Filtres</span>
                  {activeFiltersCount > 0 && <b>{activeFiltersCount}</b>}
                </button>

                <p className="prod-count">
                  {loading ? 'Chargement des produits…' : (
                    <>
                      Page <b>{pagination.page}</b> / <b>{pagination.pages}</b>
                      {' — '}
                      Affichage de <b>{filteredSorted.length}</b> produits
                    </>
                  )}
                </p>
              </div>

              <select
                className="sort-sel"
                value={sort}
                onChange={e => setSort(e.target.value)}
                aria-label="Trier les produits"
              >
                {SORT_OPTIONS.map(s => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="product-grid">
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : filteredSorted.length === 0 ? (
              <div className="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>

                <h3>Aucun produit trouvé</h3>
                <p>Essaie d'ajuster les filtres ou de consulter tous les luminaires.</p>

                <button className="btn btn-dark" onClick={onResetFilters}>
                  Réinitialiser les filtres
                </button>
              </div>
            ) : (
              <>
                <div className="product-grid">
                  {filteredSorted.map(p => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>

                <div className="shop-pagination">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={!canGoPrev || loading}
                    onClick={() => {
                      setPage(p => Math.max(1, p - 1))
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                  >
                    Précédent
                  </button>

                  <span>
                    Page {pagination.page} sur {pagination.pages}
                  </span>

                  <button
                    type="button"
                    className="btn btn-dark"
                    disabled={!canGoNext || loading}
                    onClick={() => {
                      setPage(p => Math.min(pagination.pages, p + 1))
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                  >
                    Suivant
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      <FilterDrawer
        open={filtersOpen}
        filters={filters}
        activeFiltersCount={activeFiltersCount}
        onClose={() => setFiltersOpen(false)}
        onChange={onChange}
        onReset={onResetFilters}
      />
    </>
  )
}