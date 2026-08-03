import { useEffect, useMemo, useState } from 'react'
import { fetchHomeHighlights, fetchIndex, fetchMerchants, fetchMeta } from '../lib/api'
import { clearInitialData, peekInitialData } from '../lib/initialData'
import type { FeedMeta, HomeHighlights, HomeInitialData, MerchantMeta, ProductIndexEntry } from '../types/product'
import { ProductCard } from '../components/ProductCard'
import { Carousel } from '../components/Carousel'
import { sortProducts, SORT_LABELS, type SortOption } from '../lib/sort'
import { formatIsoDateTimeBr } from '../lib/date'

const PAGE_SIZE = 60
const HOME_PATH = '/'

type IndexState = 'idle' | 'loading' | 'ready' | 'error'

export function ListingPage() {
  // scripts/prerender.mjs injeta meta/merchants/highlights (mesmos dados do
  // build) na home estática — usar isso como estado inicial faz a primeira
  // renderização do cliente bater com o HTML do servidor (evita o erro de
  // hidratação #418 já visto neste projeto) e deixa a imagem do primeiro
  // card dos Destaques já presente no HTML, sem esperar nenhum fetch.
  const [initial] = useState<HomeInitialData | null>(() => peekInitialData<HomeInitialData>(HOME_PATH))
  const [meta, setMeta] = useState<FeedMeta | null>(initial?.meta ?? null)
  const [merchants, setMerchants] = useState<MerchantMeta[]>(initial?.merchants ?? [])
  // As 3 seções curadas (Destaques/Baixou de preço/Comprado recentemente) já
  // vêm prontas do build (scripts/generate-home-highlights.mjs) — um arquivo
  // de poucos KB, bem diferente do index.json completo (>45MB hoje), que só
  // é buscado se o usuário realmente pesquisar ou filtrar por departamento
  // (ver efeito abaixo). Isso elimina o maior gargalo de LCP apontado pelo
  // Lighthouse: a home não depende mais desse arquivo gigante pra pintar.
  const [highlights, setHighlights] = useState<HomeHighlights | null>(initial?.highlights ?? null)
  const [products, setProducts] = useState<ProductIndexEntry[]>([])
  const [indexState, setIndexState] = useState<IndexState>('idle')

  const [search, setSearch] = useState('')
  const [vertical, setVertical] = useState('todos')
  const [sort, setSort] = useState<SortOption>('relevancia')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    clearInitialData(HOME_PATH)
  }, [])

  useEffect(() => {
    fetchMeta().then(setMeta).catch(() => setMeta(null))
    fetchMerchants().then(setMerchants).catch(() => setMerchants([]))
    fetchHomeHighlights().then(setHighlights).catch(() => setHighlights(null))
  }, [])

  const hasActiveFilter = Boolean(search.trim()) || vertical !== 'todos'

  // Só busca o índice completo quando vira preciso de verdade (busca ou
  // filtro de departamento ativos) — na home "limpa" (a maioria das visitas)
  // esse fetch nunca acontece.
  useEffect(() => {
    if (!hasActiveFilter || indexState !== 'idle') return
    setIndexState('loading')
    fetchIndex()
      .then((data) => {
        setProducts(data)
        setIndexState('ready')
      })
      .catch(() => setIndexState('error'))
  }, [hasActiveFilter, indexState])

  // Lista de departamentos vem do merchants.json (pequeno) — não do índice
  // completo, que só carrega depois que o usuário já escolheu filtrar.
  const verticals = useMemo(() => {
    const set = new Set(merchants.map((m) => m.vertical))
    return ['todos', ...Array.from(set).sort()]
  }, [merchants])

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

  const indexReady = indexState === 'ready'
  const visible = filtered.slice(0, visibleCount)

  const highlightsReady = highlights !== null
  const featured = highlights?.featured ?? []
  const priceDrops = highlights?.priceDrops ?? []
  const recentSales = highlights?.recentSales ?? []
  const showFeatured = highlightsReady && !hasActiveFilter && featured.length > 0
  const showPriceDrops = highlightsReady && !hasActiveFilter && priceDrops.length > 0
  const showRecentSales = highlightsReady && !hasActiveFilter && recentSales.length > 0

  return (
    <div className="page">
      <header className="page__header">
        <h1>Compare Ofertas</h1>
        {meta && (
          <p className="page__meta">
            {meta.totalProducts.toLocaleString('pt-BR')} produtos · atualizado em{' '}
            {formatIsoDateTimeBr(meta.generatedAt)}
          </p>
        )}
      </header>

      <div className="filters">
        <input
          type="search"
          placeholder="Buscar produto, loja ou categoria..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar produto, loja ou categoria"
        />
        <select value={vertical} onChange={(e) => setVertical(e.target.value)} aria-label="Departamento">
          {verticals.map((v) => (
            <option key={v} value={v}>
              {v === 'todos' ? 'Todos os departamentos' : v}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          aria-label="Ordenar por"
        >
          {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
            <option key={key} value={key}>
              {SORT_LABELS[key]}
            </option>
          ))}
        </select>
      </div>

      {!hasActiveFilter && (
        <>
          {/* A altura mínima de cada seção (via CSS) é reservada desde o
              primeiro paint, antes mesmo do home-highlights.json carregar —
              sem isso, o carrossel "pipocando" depois que o fetch termina é
              uma causa de layout shift (CLS do Lighthouse mobile). */}
          {(!highlightsReady || showFeatured) && (
            <section className="featured-section">
              {showFeatured ? (
                <>
                  <h2>Destaques</h2>
                  <Carousel>
                    {featured.map((product, i) => (
                      <ProductCard
                        key={`featured-${product.merchantSlug}-${product.slug}`}
                        product={product}
                        priority={i === 0}
                      />
                    ))}
                  </Carousel>
                </>
              ) : (
                <p className="section-skeleton__hint">Carregando destaques...</p>
              )}
            </section>
          )}

          {(!highlightsReady || showPriceDrops) && (
            <section className="price-drop-section">
              {showPriceDrops ? (
                <>
                  <h2>Baixou de preço</h2>
                  <p className="price-drop-section__hint">Ofertas que ficaram mais baratas na última semana.</p>
                  <Carousel>
                    {priceDrops.map((product, i) => (
                      <ProductCard
                        key={`price-drop-${product.merchantSlug}-${product.slug}`}
                        product={product}
                        priority={i === 0 && !showFeatured}
                      />
                    ))}
                  </Carousel>
                </>
              ) : (
                <p className="section-skeleton__hint">Carregando ofertas...</p>
              )}
            </section>
          )}

          {(!highlightsReady || showRecentSales) && (
            <section className="recent-sales-section">
              {showRecentSales ? (
                <>
                  <h2>Comprado recentemente</h2>
                  <p className="recent-sales-section__hint">
                    Produtos que outros clientes compraram através do Compare Ofertas.
                  </p>
                  <Carousel>
                    {recentSales.map(({ product, label }) => (
                      <ProductCard
                        key={`recent-${product.merchantSlug}-${product.slug}`}
                        product={product}
                        caption={`Vendido ${label}`}
                      />
                    ))}
                  </Carousel>
                </>
              ) : (
                <p className="section-skeleton__hint">Carregando vendas recentes...</p>
              )}
            </section>
          )}
        </>
      )}

      {indexState === 'error' && <p className="status status--error">Não foi possível carregar as ofertas.</p>}

      {hasActiveFilter && (
        <>
          {indexState === 'loading' && <p className="status">Carregando ofertas...</p>}
          {indexReady && filtered.length === 0 && <p className="status">Nenhum produto encontrado.</p>}

          {indexReady && filtered.length > 0 && (
            <>
              <div className="product-grid">
                {visible.map((product, i) => (
                  <ProductCard key={`${product.merchantSlug}-${product.slug}`} product={product} priority={i === 0} />
                ))}
              </div>
              {visibleCount < filtered.length && (
                <div className="load-more">
                  <button onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                    {`Carregar mais (${filtered.length - visibleCount} restantes)`}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
