import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useIndex } from '../hooks/useIndex'
import { fetchCoupons } from '../lib/api'
import { clearInitialData, peekInitialData } from '../lib/initialData'
import { parseBrDate } from '../lib/date'
import type { CouponEntry, HubInitialData } from '../types/product'
import { ProductCard } from '../components/ProductCard'
import { CouponCard } from '../components/CouponCard'
import { sortProducts, SORT_LABELS, type SortOption } from '../lib/sort'

const PAGE_SIZE = 60

// Uma única rota /:slug atende tanto "/joias" (hub de vertical) quanto
// "/vivara" (hub de loja) — o path antigo já indexado no Google era plano
// (/{loja}/{produto}), então lojas não podem ganhar um prefixo extra na URL.
// O tipo (`kind`) vem do dado pré-renderizado quando existe; só recalculamos
// a partir do índice completo depois que ele termina de carregar no cliente.
export function HubPage() {
  const { slug = '' } = useParams()
  const path = `/${slug}/`
  const [initial] = useState<HubInitialData | null>(() => peekInitialData<HubInitialData>(path))
  const { products, state } = useIndex()
  const ready = state === 'ready'

  const isVertical = useMemo(() => {
    if (ready) return products.some((p) => p.vertical === slug)
    return initial?.kind === 'vertical'
  }, [ready, products, slug, initial])

  const filtered = useMemo(() => {
    if (!ready) return []
    return products.filter((p) => (isVertical ? p.vertical === slug : p.merchantSlug === slug))
  }, [ready, products, slug, isVertical])

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [sort, setSort] = useState<SortOption>('relevancia')
  const [coupons, setCoupons] = useState<CouponEntry[]>([])

  useEffect(() => {
    clearInitialData(path)
  }, [path])

  useEffect(() => {
    if (isVertical) return
    fetchCoupons()
      .then((data) => {
        const now = new Date()
        setCoupons(
          data.filter((c) => {
            if (c.merchantSlug !== slug) return false
            const ends = parseBrDate(c.ends)
            return !ends || ends >= now
          })
        )
      })
      .catch(() => setCoupons([]))
  }, [slug, isVertical])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [slug, sort])

  const merchants = useMemo(() => {
    if (!ready || !isVertical) return []
    const map = new Map<string, { slug: string; displayName: string; count: number }>()
    for (const p of filtered) {
      const entry = map.get(p.merchantSlug) ?? { slug: p.merchantSlug, displayName: p.merchantDisplayName, count: 0 }
      entry.count += 1
      map.set(p.merchantSlug, entry)
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [ready, filtered, isVertical])

  const categories = useMemo(() => {
    if (!ready) return []
    const map = new Map<string, number>()
    for (const p of filtered) map.set(p.categorySlug, (map.get(p.categorySlug) ?? 0) + 1)
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [ready, filtered])

  const sortedFiltered = useMemo(() => sortProducts(filtered, sort), [filtered, sort])
  const items = ready ? sortedFiltered : initial?.items ?? []
  const totalCount = ready ? filtered.length : initial?.totalCount ?? 0
  const displayMerchants = ready ? merchants : initial?.merchants ?? []
  const displayCategories = ready ? categories : initial?.categories ?? []
  const displayName = isVertical ? slug : items[0]?.merchantDisplayName ?? slug
  const vertical = isVertical ? slug : items[0]?.vertical
  const visible = items.slice(0, visibleCount)

  if (ready && filtered.length === 0) {
    return (
      <div className="page">
        <p className="status">Nenhum produto encontrado para "{slug}".</p>
      </div>
    )
  }

  return (
    <div className="page">
      <nav className="breadcrumbs">
        <Link to="/">Início</Link>
        {!isVertical && vertical && (
          <>
            {' › '}
            <Link to={`/${vertical}`}>{vertical}</Link>
          </>
        )}
      </nav>
      <header className="page__header">
        <h1 style={{ textTransform: 'capitalize' }}>{isVertical ? displayName : `Ofertas ${displayName}`}</h1>
        <p className="page__meta">{totalCount.toLocaleString('pt-BR')} produtos</p>
      </header>

      {!isVertical && coupons.length > 0 && (
        <section className="hub-links">
          <h2>Cupons {displayName}</h2>
          <div className="coupon-grid">
            {coupons.map((coupon) => (
              <CouponCard key={coupon.id} coupon={coupon} />
            ))}
          </div>
        </section>
      )}

      {displayMerchants.length > 0 && (
        <section className="hub-links">
          <h2>Lojas</h2>
          <div className="hub-links__list">
            {displayMerchants.map((m) => (
              <Link key={m.slug} to={`/${m.slug}`} className="hub-chip">
                {m.displayName} <span>({m.count})</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {displayCategories.length > 0 && vertical && (
        <section className="hub-links">
          <h2>Categorias</h2>
          <div className="hub-links__list">
            {displayCategories.map(([catSlug, count]) => (
              <Link key={catSlug} to={`/${vertical}/categoria/${catSlug}`} className="hub-chip">
                {catSlug.replace(/-/g, ' ')} <span>({count})</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!ready && !initial && <p className="status">Carregando...</p>}

      {(ready || initial) && items.length > 0 && (
        <div className="filters">
          <select value={sort} onChange={(e) => setSort(e.target.value as SortOption)}>
            {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
      )}

      {(ready || initial) && (
        <>
          <div className="product-grid">
            {visible.map((product) => (
              <ProductCard key={`${product.merchantSlug}-${product.slug}`} product={product} />
            ))}
          </div>
          {ready && visibleCount < filtered.length && (
            <div className="load-more">
              <button onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                {`Carregar mais (${filtered.length - visibleCount} restantes)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
