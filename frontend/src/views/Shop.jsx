'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ProductCard from '../components/ProductCard'
import { fetchProducts, mapProduct } from '../lib/products'

const SIZES = ['small', 'medium', 'large']
const STYLES = ['modern', 'industrial', 'scandinavian', 'art-deco', 'vintage']
const COLORS = ['black', 'gold', 'white', 'silver', 'copper']
const SOURCES = ['LED Compatible', 'Dimmable', 'Smart / App Control']

const CAT_LABELS = {
  pendant: 'Pendant Lights',
  sconce: 'Wall Sconces',
  floor: 'Floor Lamps',
  table: 'Table Lamps',
}

const SORT_OPTIONS = [
  'Featured',
  'Price: Low to High',
  'Price: High to Low',
  'Newest Arrivals',
  'Best Sellers',
]

const DEFAULT_FILTERS = {
  priceMin: 0,
  priceMax: 800,
  colors: [],
  sizes: [],
  styles: [],
  sources: [],
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
  count += filters.styles.length
  count += filters.sources.length

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
        <div className="sb-title">Price Range</div>

        <div className="price-disp">
          <span>
            From <b>${filters.priceMin}</b>
          </span>
          <span>
            To <b>${filters.priceMax}</b>
          </span>
        </div>

        <div className="slider-track">
          <div
            className="slider-fill"
            style={{
              left: `${(filters.priceMin / 800) * 100}%`,
              right: `${100 - (filters.priceMax / 800) * 100}%`,
            }}
          />

          <input
            type="range"
            min="0"
            max="800"
            step="10"
            value={filters.priceMin}
            onChange={e => onChange('priceMin', Math.min(+e.target.value, filters.priceMax - 40))}
          />

          <input
            type="range"
            min="0"
            max="800"
            step="10"
            value={filters.priceMax}
            onChange={e => onChange('priceMax', Math.max(+e.target.value, filters.priceMin + 40))}
          />
        </div>
      </div>

      <div className="sb-block">
        <div className="sb-title">Finish / Colour</div>

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
        <div className="sb-title">Size</div>

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

      <div className="sb-block">
        <div className="sb-title">Style</div>

        <div className="chk-list">
          {STYLES.map(s => (
            <button
              key={s}
              type="button"
              className={`chk-row${filters.styles.includes(s) ? ' on' : ''}`}
              onClick={() => onChange('styles', s)}
            >
              <span className="chk-box" />
              <span style={{ textTransform: 'capitalize' }}>{s.replace('-', ' ')}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="sb-block">
        <div className="sb-title">Light Source</div>

        <div className="chk-list">
          {SOURCES.map(s => (
            <button
              key={s}
              type="button"
              className={`chk-row${filters.sources.includes(s) ? ' on' : ''}`}
              onClick={() => onChange('sources', s)}
            >
              <span className="chk-box" />
              <span>{s}</span>
            </button>
          ))}
        </div>
      </div>

      <button className="btn btn-ghost btn-full" style={{ marginTop: 22 }} onClick={onReset}>
        Clear All Filters
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
        aria-label="Product filters"
      >
        <div className="filter-drawer-head">
          <div>
            <p>Filters</p>
            <span>
              {activeFiltersCount > 0
                ? `${activeFiltersCount} active filter${activeFiltersCount > 1 ? 's' : ''}`
                : 'Refine the collection'}
            </span>
          </div>

          <button
            type="button"
            className="filter-close"
            aria-label="Close filters"
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
            Reset
          </button>

          <button type="button" className="btn btn-dark" onClick={onClose}>
            Apply filters
          </button>
        </div>
      </div>
    </>
  )
}

export default function Shop() {
  const params = useParams()
  const searchParams = useSearchParams()

  const category = params?.category

  const [allProducts, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('Featured')
  const [filters, setFil] = useState(DEFAULT_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const catLabel = category ? CAT_LABELS[category] || 'All Lights' : 'All Lights'
  const activeFiltersCount = countActiveFilters(filters)

  useEffect(() => {
    setLoading(true)
    setFil(DEFAULT_FILTERS)

    const apiParams = { page_size: 100 }
    if (category) apiParams.categorie = category

    fetchProducts(apiParams)
      .then(data => setAll((data.items || []).map(mapProduct).filter(Boolean)))
      .catch(() => setAll([]))
      .finally(() => setLoading(false))
  }, [category])

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
    let list = [...allProducts]

    const filterQ = searchParams.get('filter')
    if (filterQ === 'new') list = list.filter(p => p.isNew)
    if (filterQ === 'sale') list = list.filter(p => p.discount > 0)

    const q = searchParams.get('q')
    if (q) {
      const ql = q.toLowerCase()

      list = list.filter(p =>
        p.name.toLowerCase().includes(ql) ||
        p.categoryLabel.toLowerCase().includes(ql) ||
        (p.marque || '').toLowerCase().includes(ql)
      )
    }

    list = list.filter(p => {
      const productStyles = Array.isArray(p.styles) ? p.styles : []
      const productSources = Array.isArray(p.sources) ? p.sources : []

      return (
        p.salePrice >= filters.priceMin &&
        p.salePrice <= filters.priceMax &&
        (filters.colors.length === 0 || p.colors.some(c => filters.colors.includes(c))) &&
        (filters.sizes.length === 0 || p.sizes.some(s => filters.sizes.includes(s))) &&
        (filters.styles.length === 0 || productStyles.some(s => filters.styles.includes(s))) &&
        (filters.sources.length === 0 || productSources.some(s => filters.sources.includes(s)))
      )
    })

    switch (sort) {
      case 'Price: Low to High':
        list.sort((a, b) => a.salePrice - b.salePrice)
        break
      case 'Price: High to Low':
        list.sort((a, b) => b.salePrice - a.salePrice)
        break
      case 'Newest Arrivals':
        list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0))
        break
      case 'Best Sellers':
        list.sort((a, b) => (b.bestSeller ? 1 : 0) - (a.bestSeller ? 1 : 0))
        break
      default:
        list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
    }

    return list
  }, [allProducts, filters, sort, searchParams])

  return (
    <>
      <div className="shop-hero">
        <div className="page-wrap">
          <div className="shop-breadcrumb">
            <Link href="/">Home</Link>
            <span className="breadcrumb-sep">›</span>
            <span>Shop</span>
            {category && (
              <>
                <span className="breadcrumb-sep">›</span>
                <span>{catLabel}</span>
              </>
            )}
          </div>

          <h1>{catLabel}</h1>
          <p>{loading ? 'Loading…' : `${filteredSorted.length} products available`}</p>
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
                  <span>Filters</span>
                  {activeFiltersCount > 0 && <b>{activeFiltersCount}</b>}
                </button>

                <p className="prod-count">
                  {loading ? 'Loading products…' : (
                    <>
                      Showing <b>{filteredSorted.length}</b> products
                    </>
                  )}
                </p>
              </div>

              <select
                className="sort-sel"
                value={sort}
                onChange={e => setSort(e.target.value)}
                aria-label="Sort products"
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

                <h3>No products found</h3>
                <p>Try adjusting your filters or browsing all lights.</p>

                <button className="btn btn-dark" onClick={onResetFilters}>
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="product-grid">
                {filteredSorted.map(p => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
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