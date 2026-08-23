import { useEffect, useMemo, useState } from 'react'
import { Clock, Flame, Search, ShoppingBag, TrendingDown, TrendingUp } from '../components/Icon'
import { fetchHomeHighlights, fetchIndex, fetchMerchants, fetchMeta } from '../lib/api'
import { clearInitialData, peekInitialData } from '../lib/initialData'
import type { FeedMeta, HomeHighlights, HomeInitialData, MerchantMeta, ProductIndexEntry } from '../types/product'
import { ProductCard } from '../components/ProductCard'
import { Carousel } from '../components/Carousel'
import { sortProducts, SORT_LABELS, type SortOption } from '../lib/sort'
import { matchesSearch } from '../lib/search'
import { timeAgo } from '../lib/timeAgo'

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
  const [onlyPriceDrops, setOnlyPriceDrops] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  // Só definido após montar (client-only) pra o "atualizado há X" não divergir
  // do HTML pré-renderizado (evita erro de hidratação #418). Enquanto null,
  // mostra "diariamente", igual ao servidor.
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    clearInitialData(HOME_PATH)
  }, [])

  useEffect(() => {
    fetchMeta().then(setMeta).catch(() => setMeta(null))
    fetchMerchants().then(setMerchants).catch(() => setMerchants([]))
    fetchHomeHighlights().then(setHighlights).catch(() => setHighlights(null))
  }, [])

  const hasActiveFilter = Boolean(search.trim()) || vertical !== 'todos' || onlyPriceDrops

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
    const base = products.filter((p) => {
      const matchesVertical = vertical === 'todos' || p.vertical === vertical
      const matchesDrop = !onlyPriceDrops || p.priceDropPercent != null
      return matchesVertical && matchesDrop && matchesSearch([p.productName, p.merchantDisplayName, p.categorySlug], search)
    })
    return sortProducts(base, sort)
  }, [products, search, vertical, sort, onlyPriceDrops])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [search, vertical, sort, onlyPriceDrops])

  const indexReady = indexState === 'ready'
  const visible = filtered.slice(0, visibleCount)

  const highlightsReady = highlights !== null
  const featured = highlights?.featured ?? []
  const priceDrops = highlights?.priceDrops ?? []
  const recentSales = highlights?.recentSales ?? []
  const priceDropsCount = highlights?.priceDropsCount ?? 0
  const showFeatured = highlightsReady && !hasActiveFilter && featured.length > 0
  const showPriceDrops = highlightsReady && !hasActiveFilter && priceDrops.length > 0
  const showRecentSales = highlightsReady && !hasActiveFilter && recentSales.length > 0

  return (
    <div className="page">
      {/* Hero: a busca é o protagonista (o site é um monitor de preços, não
          só um catálogo). Só aparece na home "limpa" — quando o usuário já
          está filtrando/buscando, o topo enxuga pra dar espaço aos resultados. */}
      <section className={`home-hero${hasActiveFilter ? ' home-hero--compact' : ''}`}>
        {!hasActiveFilter && (
          <div className="home-hero__intro">
            <h1 className="home-hero__title">
              Compare preços <span className="home-hero__title-accent">antes de comprar.</span>
            </h1>
            <p className="home-hero__subtitle">Encontre as melhores ofertas e economize no que importa.</p>
          </div>
        )}

        <div className="home-hero__main">
        {/* Campo de busca "abraça" os selects: um container arredondado único
            (lupa + input sem borda + dropdowns encaixados à direita), como no
            mockup. Empilha os selects abaixo do input no mobile. */}
        <div className="home-search">
          <Search className="home-search__icon" size={20} aria-hidden="true" />
          <input
            type="search"
            className="home-search__input"
            placeholder="O que você está procurando? Ex.: tênis Nike, iPhone, bolsa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar produto, loja ou categoria"
          />
          <div className="home-search__filters">
            <select
              className="home-search__select"
              value={vertical}
              onChange={(e) => setVertical(e.target.value)}
              aria-label="Departamento"
            >
              {verticals.map((v) => (
                <option key={v} value={v}>
                  {v === 'todos' ? 'Todos os departamentos' : v}
                </option>
              ))}
            </select>
            <select
              className="home-search__select"
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
        </div>

        <label className={`drops-toggle${onlyPriceDrops ? ' drops-toggle--on' : ''}`}>
          <input
            type="checkbox"
            checked={onlyPriceDrops}
            onChange={(e) => setOnlyPriceDrops(e.target.checked)}
          />
          <TrendingDown size={16} strokeWidth={2.5} aria-hidden="true" />
          Só produtos que caíram de preço
        </label>

        {/* Prova de valor — só dado real: total de produtos (meta.json),
            quantas quedas de preço confirmadas nesta atualização
            (home-highlights.json), e a cadência (cron diário do deploy). */}
        {!hasActiveFilter && (meta || priceDropsCount > 0) && (
          <div className="home-hero__stats">
            {meta && (
              <div className="home-stat">
                <span className="home-stat__icon home-stat__icon--products" aria-hidden="true">
                  <TrendingUp size={26} strokeWidth={2.5} />
                </span>
                <span className="home-stat__body">
                  <strong>{meta.totalProducts.toLocaleString('pt-BR')}</strong>
                  <span className="home-stat__label">produtos monitorados</span>
                </span>
              </div>
            )}
            {priceDropsCount > 0 && (
              <div className="home-stat">
                <span className="home-stat__icon home-stat__icon--drop" aria-hidden="true">
                  <TrendingDown size={26} strokeWidth={2.5} />
                </span>
                <span className="home-stat__body">
                  <strong>{priceDropsCount.toLocaleString('pt-BR')}</strong>
                  <span className="home-stat__label">preços em queda</span>
                </span>
              </div>
            )}
            <div className="home-stat">
              <span className="home-stat__icon home-stat__icon--sync" aria-hidden="true">
                <Clock size={26} strokeWidth={2.5} />
              </span>
              <span className="home-stat__body">
                <strong>Atualizado</strong>
                <span
                  className="home-stat__label"
                  title={
                    meta?.generatedAt
                      ? `Última atualização: ${new Date(meta.generatedAt).toLocaleString('pt-BR')} · atualizamos diariamente`
                      : undefined
                  }
                >
                  {now && meta?.generatedAt ? timeAgo(meta.generatedAt, now) : 'diariamente'}
                </span>
              </span>
            </div>
          </div>
        )}
        </div>
      </section>

      {!hasActiveFilter && (
        <>
          {/* "Baixou de preço" primeiro: é o diferencial do site (descobrir
              oferta boa), não só mais um catálogo. A altura mínima de cada
              seção (via CSS) é reservada desde o primeiro paint, antes do
              home-highlights.json carregar — sem isso o carrossel "pipoca"
              depois do fetch e causa layout shift (CLS do Lighthouse mobile). */}
          {(!highlightsReady || showPriceDrops) && (
            <section className="price-drop-section">
              {showPriceDrops ? (
                <>
                  <h2 className="section-title">
                    <TrendingDown className="section-title__icon section-title__icon--drop" size={22} strokeWidth={2.5} />
                    Caiu de preço
                  </h2>
                  <p className="price-drop-section__hint">Produtos que ficaram mais baratos nas últimas atualizações.</p>
                  <Carousel>
                    {priceDrops.map((product, i) => (
                      <ProductCard
                        key={`price-drop-${product.merchantSlug}-${product.slug}`}
                        product={product}
                        priority={i === 0}
                      />
                    ))}
                  </Carousel>
                </>
              ) : (
                <p className="section-skeleton__hint">Carregando ofertas...</p>
              )}
            </section>
          )}

          {(!highlightsReady || showFeatured) && (
            <section className="featured-section">
              {showFeatured ? (
                <>
                  <h2 className="section-title">
                    <Flame className="section-title__icon section-title__icon--fire" size={22} strokeWidth={2.5} />
                    Ofertas em destaque
                  </h2>
                  <p className="featured-section__hint">Seleção de boas oportunidades das lojas parceiras.</p>
                  <Carousel>
                    {featured.map((product, i) => (
                      <ProductCard
                        key={`featured-${product.merchantSlug}-${product.slug}`}
                        product={product}
                        priority={i === 0 && !showPriceDrops}
                      />
                    ))}
                  </Carousel>
                </>
              ) : (
                <p className="section-skeleton__hint">Carregando destaques...</p>
              )}
            </section>
          )}

          {(!highlightsReady || showRecentSales) && (
            <section className="recent-sales-section">
              {showRecentSales ? (
                <>
                  <h2 className="section-title">
                    <ShoppingBag className="section-title__icon section-title__icon--bag" size={22} strokeWidth={2.5} />
                    Comprado recentemente
                  </h2>
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
