import { useEffect, useMemo, useState } from 'react'
import { useIndex } from '../hooks/useIndex'
import { ProductCard } from '../components/ProductCard'

const PAGE_SIZE = 60

export function ListingPage() {
  const { products, meta, state } = useIndex()
  const [search, setSearch] = useState('')
  const [vertical, setVertical] = useState('todos')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const verticals = useMemo(() => {
    const set = new Set(products.map((p) => p.vertical))
    return ['todos', ...Array.from(set).sort()]
  }, [products])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return products.filter((p) => {
      const matchesVertical = vertical === 'todos' || p.vertical === vertical
      const matchesSearch =
        !term ||
        p.productName.toLowerCase().includes(term) ||
        p.merchantDisplayName.toLowerCase().includes(term) ||
        p.categorySlug.toLowerCase().includes(term)
      return matchesVertical && matchesSearch
    })
  }, [products, search, vertical])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [search, vertical])

  const visible = filtered.slice(0, visibleCount)

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
