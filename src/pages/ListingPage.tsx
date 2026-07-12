import { useEffect, useMemo, useState } from 'react'
import { useIndex } from '../hooks/useIndex'
import { fetchMerchants } from '../lib/api'
import type { MerchantMeta, ProductIndexEntry } from '../types/product'
import { ProductCard } from '../components/ProductCard'
import { sortProducts, SORT_LABELS, type SortOption } from '../lib/sort'

const PAGE_SIZE = 60

function pickFeatured(products: ProductIndexEntry[], merchants: MerchantMeta[]): ProductIndexEntry[] {
  const prioritySlugs = merchants.filter((m) => m.priority).map((m) => m.slug)
  const featured: ProductIndexEntry[] = []
  for (const slug of prioritySlugs) {
    const items = products
      .filter((p) => p.merchantSlug === slug && p.searchPrice != null)
      .sort((a, b) => a.searchPrice! - b.searchPrice!)
    if (items.length === 0) continue
    // Pega o item "do meio" (mediana de preço) — evita mostrar sempre o mais
    // barato/mais caro, dá uma sensação de curadoria em vez de extremo aleatório.
    featured.push(items[Math.floor(items.length / 2)])
  }
  return featured
}

export function ListingPage() {
  const { products, meta, state } = useIndex()
  const [merchants, setMerchants] = useState<MerchantMeta[]>([])
  const [search, setSearch] = useState('')
  const [vertical, setVertical] = useState('todos')
  const [sort, setSort] = useState<SortOption>('relevancia')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    fetchMerchants().then(setMerchants).catch(() => setMerchants([]))
  }, [])

  const featured = useMemo(() => pickFeatured(products, merchants), [products, merchants])

  const verticals = useMemo(() => {
    const set = new Set(products.map((p) => p.vertical))
    return ['todos', ...Array.from(set).sort()]
  }, [products])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const base = products.filter((p) => {
      const matchesVertical = vertical === 'todos' || p.vertical === vertical
      const matchesSearch =
        !term ||
        p.productName.toLowerCase().includes(term) ||
        p.merchantDisplayName.toLowerCase().includes(term) ||
        p.categorySlug.toLowerCase().includes(term)
      return matchesVertical && matchesSearch
    })
    return sortProducts(base, sort)
  }, [products, search, vertical, sort])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [search, vertical, sort])

  const visible = filtered.slice(0, visibleCount)
  const showFeatured = state === 'ready' && !search && vertical === 'todos' && featured.length > 0

  return (
    <div className="page">
      <header className="page__header">
        <h1>Compare Ofertas</h1>
        {meta && (
          <p className="page__meta">
            {meta.totalProducts.toLocaleString('pt-BR')} produtos · atualizado em{' '}
            {new Date(meta.generatedAt).toLocaleString('pt-BR')}
          </p>
        )}
      </header>

      {showFeatured && (
        <section className="featured-section">
          <h2>Destaques</h2>
          <div className="product-grid">
            {featured.map((product) => (
              <ProductCard key={`featured-${product.merchantSlug}-${product.slug}`} product={product} />
            ))}
          </div>
        </section>
      )}

      <div className="filters">
        <input
          type="search"
          placeholder="Buscar produto, loja ou categoria..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={vertical} onChange={(e) => setVertical(e.target.value)}>
          {verticals.map((v) => (
            <option key={v} value={v}>
              {v === 'todos' ? 'Todos os departamentos' : v}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortOption)}>
          {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
            <option key={key} value={key}>
              {SORT_LABELS[key]}
            </option>
          ))}
        </select>
      </div>

      {state === 'loading' && <p className="status">Carregando ofertas...</p>}
      {state === 'error' && <p className="status status--error">Não foi possível carregar as ofertas.</p>}
      {state === 'ready' && filtered.length === 0 && <p className="status">Nenhum produto encontrado.</p>}

      {state === 'ready' && (
        <>
          <div className="product-grid">
            {visible.map((product) => (
              <ProductCard key={`${product.merchantSlug}-${product.slug}`} product={product} />
            ))}
          </div>
          {visibleCount < filtered.length && (
            <div className="load-more">
              <button onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                Carregar mais ({filtered.length - visibleCount} restantes)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
