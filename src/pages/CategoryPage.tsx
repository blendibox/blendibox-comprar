import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useIndex } from '../hooks/useIndex'
import { consumeInitialData } from '../lib/initialData'
import type { ListInitialData } from '../types/product'
import { ProductCard } from '../components/ProductCard'

const PAGE_SIZE = 60

export function CategoryPage() {
  const { vertical = '', categorySlug = '' } = useParams()
  const path = `/${vertical}/categoria/${categorySlug}/`
  const [initial] = useState<ListInitialData | null>(() => consumeInitialData<ListInitialData>(path))
  const { products, state } = useIndex()
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const filtered = useMemo(
    () => products.filter((p) => p.vertical === vertical && p.categorySlug === categorySlug),
    [products, vertical, categorySlug]
  )

  const ready = state === 'ready'
  const items = ready ? filtered : initial?.items ?? []
  const totalCount = ready ? filtered.length : initial?.totalCount ?? 0
  const visible = items.slice(0, visibleCount)

  return (
    <div className="page">
      <nav className="breadcrumbs">
        <a href="/">Início</a>
        {' › '}
        <a href={`/${vertical}`}>{vertical}</a>
      </nav>
      <header className="page__header">
        <h1 style={{ textTransform: 'capitalize' }}>{categorySlug.replace(/-/g, ' ')}</h1>
        <p className="page__meta">{totalCount.toLocaleString('pt-BR')} produtos</p>
      </header>

      {state === 'loading' && !initial && <p className="status">Carregando...</p>}
      {state === 'ready' && filtered.length === 0 && <p className="status">Nenhum produto encontrado nesta categoria.</p>}

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
                Carregar mais ({filtered.length - visibleCount} restantes)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
