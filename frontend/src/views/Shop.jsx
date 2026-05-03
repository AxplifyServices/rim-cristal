'use client'
import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ProductCard from '../components/ProductCard'
import { fetchProducts, mapProduct } from '../lib/products'

const SIZES   = ['small', 'medium', 'large']
const STYLES  = ['modern', 'industrial', 'scandinavian', 'art-deco', 'vintage']
const COLORS  = ['black', 'gold', 'white', 'silver', 'copper']
const SOURCES = ['LED Compatible', 'Dimmable', 'Smart / App Control']
const CAT_LABELS = { pendant: 'Pendant Lights', sconce: 'Wall Sconces', floor: 'Floor Lamps', table: 'Table Lamps' }

const SORT_OPTIONS = ['Featured', 'Price: Low to High', 'Price: High to Low', 'Newest Arrivals', 'Best Sellers']

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

function Sidebar({ filters, onChange, onReset }) {
  return (
    <aside className="sidebar">
      <div className="sb-block">
        <div className="sb-title">Price Range</div>
        <div className="price-disp">
          <span>From <b>${filters.priceMin}</b></span>
          <span>To <b>${filters.priceMax}</b></span>
        </div>
        <div className="slider-track">
          <div
            className="slider-fill"
            style={{ left: `${(filters.priceMin / 800) * 100}%`, right: `${100 - (filters.priceMax / 800) * 100}%` }}
          />
          <input type="range" min="0" max="800" step="10" value={filters.priceMin}
            onChange={e => onChange('priceMin', Math.min(+e.target.value, filters.priceMax - 40))} />
          <input type="range" min="0" max="800" step="10" value={filters.priceMax}
            onChange={e => onChange('priceMax', Math.max(+e.target.value, filters.priceMin + 40))} />
        </div>
      </div>

      <div className="sb-block">
        <div className="sb-title">Finish / Colour</div>
        <div className="swatches">
          {COLORS.map(c => (
            <div key={c} className={`swatch${filters.colors.includes(c) ? ' on' : ''}`}
              data-c={c} title={c} onClick={() => onChange('colors', c)} />
          ))}
        </div>
      </div>

      <div className="sb-block">
        <div className="sb-title">Size</div>
        <div className="chk-list">
          {SIZES.map(s => (
            <div key={s} className={`chk-row${filters.sizes.includes(s) ? ' on' : ''}`} onClick={() => onChange('sizes', s)}>
              <div className="chk-box" />
              <span style={{ textTransform: 'capitalize' }}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="sb-block">
        <div className="sb-title">Style</div>
        <div className="chk-list">
          {STYLES.map(s => (
            <div key={s} className={`chk-row${filters.styles.includes(s) ? ' on' : ''}`} onClick={() => onChange('styles', s)}>
              <div className="chk-box" />
              <span style={{ textTransform: 'capitalize' }}>{s.replace('-', ' ')}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="sb-block">
        <div className="sb-title">Light Source</div>
        <div className="chk-list">
          {SOURCES.map(s => (
            <div key={s} className={`chk-row${filters.sources.includes(s) ? ' on' : ''}`} onClick={() => onChange('sources', s)}>
              <div className="chk-box" />
              <span>{s}</span>
            </div>
          ))}
        </div>
      </div>

      <button className="btn btn-ghost btn-full" style={{ marginTop: 22 }} onClick={onReset}>
        Clear All Filters
      </button>
    </aside>
  )
}

const DEFAULT_FILTERS = { priceMin: 0, priceMax: 800, colors: [], sizes: [], styles: [], sources: [] }
function toggle(arr, val) { return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] }

export default function Shop() {
  const params       = useParams()
  const category     = params?.category
  const searchParams = useSearchParams()

  const [allProducts, setAll]  = useState([])
  const [loading, setLoading]  = useState(true)
  const [sort, setSort]        = useState('Featured')
  const [filters, setFil]      = useState(DEFAULT_FILTERS)

  const catLabel = category ? (CAT_LABELS[category] || 'All Lights') : 'All Lights'

  // Fetch from API whenever category changes
  useEffect(() => {
    setLoading(true)
    setFil(DEFAULT_FILTERS)
    const params = { page_size: 100 }
    if (category) params.categorie = category
    fetchProducts(params)
      .then(data => setAll((data.items || []).map(mapProduct)))
      .catch(() => setAll([]))
      .finally(() => setLoading(false))
  }, [category])

  const onChange = (key, val) => {
    if (key === 'priceMin' || key === 'priceMax') setFil(f => ({ ...f, [key]: val }))
    else setFil(f => ({ ...f, [key]: toggle(f[key], val) }))
  }

  const filteredSorted = useMemo(() => {
    let list = [...allProducts]

    // URL filter badges
    const filterQ = searchParams.get('filter')
    if (filterQ === 'new')  list = list.filter(p => p.isNew)
    if (filterQ === 'sale') list = list.filter(p => p.discount > 0)

    // Search query
    const q = searchParams.get('q')
    if (q) {
      const ql = q.toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(ql) ||
        p.categoryLabel.toLowerCase().includes(ql) ||
        (p.marque || '').toLowerCase().includes(ql)
      )
    }

    // Sidebar filters (client-side)
    list = list.filter(p =>
      p.salePrice >= filters.priceMin &&
      p.salePrice <= filters.priceMax &&
      (filters.colors.length === 0 || p.colors.some(c => filters.colors.includes(c))) &&
      (filters.sizes.length  === 0 || p.sizes.some(s => filters.sizes.includes(s)))
    )

    // Sort
    switch (sort) {
      case 'Price: Low to High': list.sort((a, b) => a.salePrice - b.salePrice); break
      case 'Price: High to Low': list.sort((a, b) => b.salePrice - a.salePrice); break
      case 'Newest Arrivals':    list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0)); break
      case 'Best Sellers':       list.sort((a, b) => (b.bestSeller ? 1 : 0) - (a.bestSeller ? 1 : 0)); break
      default:                   list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
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
            {category && <><span className="breadcrumb-sep">›</span><span>{catLabel}</span></>}
          </div>
          <h1>{catLabel}</h1>
          <p>{loading ? 'Loading…' : `${filteredSorted.length} products available`}</p>
        </div>
      </div>

      <div className="page-wrap">
        <div className="shop-layout">
          <Sidebar filters={filters} onChange={onChange} onReset={() => setFil(DEFAULT_FILTERS)} />

          <section>
            <div className="prod-bar">
              <p className="prod-count">
                {loading ? 'Loading products…' : <>Showing <b>{filteredSorted.length}</b> products</>}
              </p>
              <select className="sort-sel" value={sort} onChange={e => setSort(e.target.value)}>
                {SORT_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            {loading ? (
              <div className="product-grid">
                {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : filteredSorted.length === 0 ? (
              <div className="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <h3>No products found</h3>
                <p>Try adjusting your filters or browsing all lights.</p>
                <button className="btn btn-dark" onClick={() => setFil(DEFAULT_FILTERS)}>Clear Filters</button>
              </div>
            ) : (
              <div className="product-grid">
                {filteredSorted.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
