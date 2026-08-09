import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { TrendingDown } from 'lucide-react'
import { useIndex } from '../hooks/useIndex'
import { clearInitialData, peekInitialData } from '../lib/initialData'
import type { ListInitialData } from '../types/product'
import { ProductCard } from '../components/ProductCard'
import { sortProducts, SORT_LABELS, type SortOption } from '../lib/sort'
import { matchesSearch } from '../lib/search'

const PAGE_SIZE = 60

export function CategoryPage() {
  const { vertical = '', categorySlug = '' } = useParams()
  const path = `/${vertical}/categoria/${categorySlug}/`
  const [initial] = useState<ListInitialData | null>(() => peekInitialData<ListInitialData>(path))
  const { products, state } = useIndex()
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [sort, setSort] = useState<SortOption>('relevancia')
  const [search, setSearch] = useState('')
  const [onlyPriceDrops, setOnlyPriceDrops] = useState(false)

  const filtered = useMemo(
    () => products.filter((p) => p.vertical === vertical && p.categorySlug === categorySlug),
    [products, vertical, categorySlug]
  )

  const ready = state === 'ready'
  const sortedFiltered = useMemo(() => sortProducts(filtered, sort), [filtered, sort])
  // Busca e filtro de queda são camadas em cima do que já pertence à
  // categoria — o cabeçalho (totalCount) continua contando o total da
  // categoria, não o resultado filtrado.
  const searched = useMemo(() => {
    return sortedFiltered.filter((p) => {
      const matchesDrop = !onlyPriceDrops || p.priceDropPercent != null
      const matchesText = !search.trim() || matchesSearch([p.productName, p.merchantDisplayName, p.categorySlug], search)
      return matchesDrop && matchesText
    })
  }, [sortedFiltered, search, onlyPriceDrops])
  const items = ready ? searched : initial?.items ?? []
  const totalCount = ready ? filtered.length : initial?.totalCount ?? 0
  const visible = items.slice(0, visibleCount)

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [vertical, categorySlug, sort, search, onlyPriceDrops])

  useEffect(() => {
    clearInitialData(path)
  }, [path])

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

      {(ready ? filtered.length > 0 : Boolean(initial)) && (
        <div className="filters">
          <input
            type="search"
            placeholder={`Buscar em ${categorySlug.replace(/-/g, ' ')}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={`Buscar em ${categorySlug.replace(/-/g, ' ')}`}
          />
          <select value={sort} onChange={(e) => setSort(e.target.value as SortOption)} aria-label="Ordenar por">
            {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
          <label className={`drops-toggle${onlyPriceDrops ? ' drops-toggle--on' : ''}`}>
            <input
              type="checkbox"
              checked={onlyPriceDrops}
              onChange={(e) => setOnlyPriceDrops(e.target.checked)}
            />
            <TrendingDown size={15} strokeWidth={2.5} aria-hidden="true" />
            Só quedas de preço
          </label>
        </div>
      )}

      {ready && filtered.length > 0 && items.length === 0 && (
        <p className="status">Nenhum produto encontrado com esses filtros.</p>
      )}

      {(ready || initial) && items.length > 0 && (
        <>
          <div className="product-grid">
            {visible.map((product, i) => (
              <ProductCard key={`${product.merchantSlug}-${product.slug}`} product={product} priority={i === 0} />
            ))}
          </div>
          {ready && visibleCount < items.length && (
            <div className="load-more">
              <button onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                {`Carregar mais (${items.length - visibleCount} restantes)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
