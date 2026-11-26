import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '../components/Link'
import { fetchCouponStoreKeywords, fetchCoupons } from '../lib/api'
import { clearInitialData, peekInitialData } from '../lib/initialData'
import {
  PAGE_SIZE,
  buildOverview,
  filterCoupons,
  interleaveByStore,
  isStillValid,
  prepareCoupons,
  storeKey,
  storesSelling,
  summarize,
  verticalLabel,
  type CouponItem,
  type CouponType,
  type CouponsPageData,
  type StoreKeywords,
} from '../lib/coupons'
import { useUrlParam } from '../hooks/useListingState'
import { CouponTicket } from '../components/coupons/CouponTicket'
import { OfferCard } from '../components/coupons/OfferCard'
import { StorePicker } from '../components/coupons/StorePicker'
import { StoreChecklist } from '../components/coupons/StoreChecklist'
import { InfoTip } from '../components/coupons/InfoTip'
import { MerchantLogo } from '../components/MerchantLogo'
import { Search, TrendingDown, X } from '../components/Icon'

const PATH = '/cupons/'
// altura do cabeçalho fixo (mesmo valor de --coupons-sticky-top no CSS)
const STICKY_TOP = 52
const RELATED_PER_STORE = 3

const parseType = (raw: string): CouponType | null => (raw === 'codigo' || raw === 'oferta' ? raw : null)

export function CouponsPage() {
  // Dado do prerender: a visão inicial já vem no HTML (o Google lê os cupons).
  const [initial] = useState<CouponsPageData | null>(() => peekInitialData<CouponsPageData>(PATH))
  const [items, setItems] = useState<CouponItem[] | null>(null)
  const [now, setNow] = useState<Date | null>(null)
  const [failed, setFailed] = useState(false)

  // Busca e filtros na URL (?busca= &tipo= &cat= &loja=). Com HTML pré-renderizado
  // a 1ª renderização ignora a URL (igual ao servidor) e aplica logo em seguida.
  // ?loja=<merchantSlug> é o link "ver mais cupons" da página de produto.
  const deferInitial = Boolean(initial)
  const [term, setTerm] = useUrlParam<string>('busca', '', { debounceMs: 250, deferInitial })
  const [type, setType] = useUrlParam<CouponType>('tipo', '', { parse: parseType, deferInitial })
  const [vertical, setVertical] = useUrlParam<string>('cat', '', { deferInitial })
  const [store, setStore] = useUrlParam<string>('loja', '', { deferInitial })
  // lojas DESmarcadas na lista de resultados da busca (?sem=kabum,spicy)
  const [without, setWithout] = useUrlParam<string>('sem', '', { deferInitial })
  const [keywords, setKeywords] = useState<StoreKeywords | null>(null)
  const [allRelated, setAllRelated] = useState(false)
  const [visible, setVisible] = useState(PAGE_SIZE)
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    clearInitialData(PATH)
  }, [])

  useEffect(() => {
    fetchCoupons()
      .then((data) => {
        // O build já tira os vencidos, mas o dado só é renovado 1x por dia.
        const date = new Date()
        setNow(date)
        setItems(prepareCoupons(data.filter((c) => isStillValid(c, date))))
      })
      .catch(() => setFailed(true))
  }, [])

  useEffect(() => {
    setVisible(PAGE_SIZE)
    setAllRelated(false)
    // Quem busca/filtra com a barra já grudada no topo (rolou a lista) volta pro
    // começo dos resultados — senão a lista encolhe e sobra só o rodapé na tela.
    const anchor = topRef.current
    if (anchor && anchor.getBoundingClientRect().top < STICKY_TOP) anchor.scrollIntoView({ block: 'start' })
  }, [term, type, vertical, store])

  // Palavras do catálogo por loja: só baixa quando alguém pesquisa. Se o arquivo
  // faltar, a página funciona igual, sem a seção "lojas que têm o produto".
  const wantsKeywords = Boolean(term.trim())
  useEffect(() => {
    if (!wantsKeywords || keywords) return
    fetchCouponStoreKeywords()
      .then(setKeywords)
      .catch(() => {})
  }, [wantsKeywords, keywords])

  const summary = useMemo(() => (items ? summarize(items) : (initial?.summary ?? null)), [items, initial])
  const isOverview = !term.trim() && !type && !store

  const overview = useMemo(() => {
    if (items) return buildOverview(items, vertical)
    if (initial && !vertical) return { codes: initial.codes, codeTotal: initial.summary.codes, blocks: initial.blocks }
    return null
  }, [items, initial, vertical])

  const results = useMemo(
    () => (items && !isOverview ? filterCoupons(items, { term, type, vertical, store }) : null),
    [items, isOverview, term, type, vertical, store],
  )

  // Cupons gerais (com código) de lojas que têm o que foi buscado no catálogo,
  // mesmo sem o cupom citar a palavra. relatedPool = antes dos filtros de tipo e
  // categoria (os contadores precisam dele).
  const selling = useMemo(
    () => (keywords && term.trim() ? storesSelling(term, keywords) : new Map<string, number>()),
    [keywords, term],
  )
  const relatedPool = useMemo(() => {
    if (!items || !selling.size) return []
    const direct = new Set(filterCoupons(items, { term, type: '', vertical: '', store: '' }).map((c) => c.id))
    return items.filter((c) => c.isVoucher && !direct.has(c.id) && selling.has(storeKey(c)) && (!store || storeKey(c) === store))
  }, [items, selling, term, store])
  const related = useMemo(() => {
    if (type === 'oferta') return []
    const candidates = relatedPool.filter((c) => !vertical || c.vertical === vertical)
    // quem tem mais produtos com o termo aparece primeiro
    candidates.sort((a, b) => (selling.get(storeKey(b)) ?? 0) - (selling.get(storeKey(a)) ?? 0))
    return interleaveByStore(candidates)
  }, [relatedPool, selling, type, vertical])

  // Números dos filtros: quantos resultados cada opção daria com os demais filtros.
  const typeCounts = useMemo(() => {
    if (!items) return summary ? { all: summary.codes + summary.offers, codes: summary.codes, offers: summary.offers } : null
    const base = filterCoupons(items, { term, type: '', vertical, store })
    const codes = base.filter((c) => c.isVoucher).length
    const extra = relatedPool.filter((c) => !vertical || c.vertical === vertical).length
    return { all: base.length + extra, codes: codes + extra, offers: base.length - codes }
  }, [items, summary, term, vertical, store, relatedPool])

  const verticalCounts = useMemo(() => {
    if (!items) return new Map(summary?.verticals.map((v) => [v.id, v.count]) ?? [])
    const base = filterCoupons(items, { term, type, vertical: '', store })
    const shownTogether = type === 'oferta' ? base : [...base, ...relatedPool]
    return new Map(summarize(shownTogether).verticals.map((v) => [v.id, v.count]))
  }, [items, summary, term, type, store, relatedPool])

  // O seletor de loja busca dentro do que o tipo e a categoria já deixaram passar.
  const pickerPool = useMemo(
    () => (items ? filterCoupons(items, { term: '', type, vertical, store: '' }) : null),
    [items, type, vertical],
  )

  // Caixas de seleção: só numa busca que pode trazer várias lojas.
  const multiStore = Boolean(term.trim()) && !store
  const resultStores = useMemo(() => {
    if (!multiStore || !results) return []
    const map = new Map<string, { slug: string; name: string; count: number; direct: number }>()
    const add = (c: CouponItem, isDirect: boolean) => {
      const slug = storeKey(c)
      const entry = map.get(slug) ?? { slug, name: c.advertiser, count: 0, direct: 0 }
      entry.count++
      if (isDirect) entry.direct++
      map.set(slug, entry)
    }
    results.forEach((c) => add(c, true))
    related.forEach((c) => add(c, false))
    return [...map.values()].sort((a, b) => b.direct - a.direct || b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'))
  }, [multiStore, results, related])

  const excluded = useMemo(() => new Set(multiStore ? without.split(',').filter(Boolean) : []), [multiStore, without])
  const keep = (c: CouponItem) => !excluded.has(storeKey(c))
  const visibleResults = results?.filter(keep) ?? []
  const visibleRelated = related.filter(keep)
  // De início, poucos por loja: uma loja com dezenas de cupons (muitos de outra
  // linha de produto) não pode afogar as demais.
  const perStore = new Map<string, number>()
  const shownRelated = allRelated
    ? visibleRelated
    : visibleRelated.filter((c) => {
        const n = (perStore.get(storeKey(c)) ?? 0) + 1
        perStore.set(storeKey(c), n)
        return n <= RELATED_PER_STORE
      })
  // lojas da seção relacionada, com quantos produtos do catálogo casam
  const relatedStores = [...new Map(visibleRelated.map((c) => [storeKey(c), c.advertiser])).entries()]

  const storeName = summary?.stores.find((s) => s.slug === store)?.name
  const hasFilters = Boolean(term || type || vertical || store)
  const query = term.trim()

  const showChecklist = resultStores.length > 1
  const resultSummary = [
    `${visibleResults.length} ${visibleResults.length === 1 ? 'resultado' : 'resultados'}`,
    query && ` para “${query}”`,
    storeName && ` em ${storeName}`,
    visibleRelated.length > 0 &&
      ` + ${visibleRelated.length} ${visibleRelated.length === 1 ? 'cupom' : 'cupons'} de lojas que têm “${query}”`,
  ]
    .filter(Boolean)
    .join('')

  function changeTerm(next: string) {
    setTerm(next)
    // busca nova: volta a mostrar todas as lojas
    if (without) setWithout('')
  }

  function clearFilters() {
    setType('')
    setVertical('')
    setStore('')
    setWithout('')
    setTerm('')
  }

  function scrollToResults() {
    topRef.current?.scrollIntoView({ block: 'start' })
  }

  function showStoreOffers(slug: string) {
    setStore(slug)
    setType('oferta')
    scrollToResults()
  }

  const shown = visibleResults.slice(0, visible)
  const shownCodes = shown.filter((c) => c.isVoucher)
  const shownOffers = shown.filter((c) => !c.isVoucher)
  const productSearch = query ? `/?busca=${encodeURIComponent(query)}` : null

  return (
    <div className="page coupons-hub">
      <header className="page__header coupons-title">
        <h1>Cupons e ofertas</h1>
        <InfoTip label="Sobre os cupons desta página">
          {summary
            ? `${summary.codes} cupons com código e ${summary.offers} ofertas de ${summary.stores.length} lojas, atualizados todo dia.`
            : 'Códigos de desconto e promoções das lojas parceiras, atualizados todo dia.'}
        </InfoTip>
      </header>

      <div ref={topRef} className="coupons-anchor" />
      <div className="coupons-toolbar">
        <div className="coupons-search">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={term}
            onChange={(e) => changeTerm(e.target.value)}
            placeholder="Loja, produto, código ou desconto %"
            aria-label="Buscar nos cupons por loja, produto, código ou valor do desconto"
            enterKeyHint="search"
          />
          {term && (
            <button type="button" className="coupons-search__clear" onClick={() => changeTerm('')} aria-label="Limpar busca">
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="coupons-types" role="group" aria-label="Tipo de desconto">
          {(
            [
              ['', 'Todos', typeCounts?.all],
              ['codigo', 'Com código', typeCounts?.codes],
              ['oferta', 'Ofertas', typeCounts?.offers],
            ] as const
          ).map(([value, label, count]) => (
            <button key={value || 'todos'} type="button" aria-pressed={type === value} onClick={() => setType(value)}>
              {label}
              {count != null && <span className="coupons-types__count">{count}</span>}
            </button>
          ))}
        </div>
      </div>

      {summary && (
        <div className="coupons-filters">
          <div className="coupons-chips" role="group" aria-label="Categoria">
            <button type="button" aria-pressed={!vertical} onClick={() => setVertical('')}>
              Todas
            </button>
            {summary.verticals
              .filter((v) => verticalCounts.get(v.id) || vertical === v.id)
              .map((v) => (
                <button key={v.id} type="button" aria-pressed={vertical === v.id} onClick={() => setVertical(vertical === v.id ? '' : v.id)}>
                  {verticalLabel(v.id)} <span>{verticalCounts.get(v.id) ?? 0}</span>
                </button>
              ))}
          </div>
          {!multiStore && (
          <StorePicker
            stores={summary.stores}
            pool={pickerPool}
            value={store}
            currentTerm={term}
            onSelect={(slug, nextTerm) => {
              setStore(slug)
              setWithout('')
              if (nextTerm !== term) setTerm(nextTerm)
            }}
          />
          )}
        </div>
      )}

      {failed && !overview && <p className="status status--error">Não foi possível carregar os cupons.</p>}
      {!failed && !overview && <p className="status">Carregando cupons...</p>}

      {isOverview && overview && (
        <>
          {overview.codes.length > 0 && (
            <section className="coupons-section" aria-labelledby="coupons-codes-title">
              <div className="coupons-section__head">
                <h2 id="coupons-codes-title">Cupons com código</h2>
                {overview.codeTotal > overview.codes.length && (
                  <button
                    type="button"
                    className="coupons-link-button"
                    onClick={() => {
                      setType('codigo')
                      scrollToResults()
                    }}
                  >
                    {`Ver todos os ${overview.codeTotal} →`}
                  </button>
                )}
              </div>
              <div className="ticket-grid">
                {overview.codes.map((coupon) => (
                  <CouponTicket key={coupon.id} coupon={coupon} now={now} />
                ))}
              </div>
            </section>
          )}

          {overview.blocks.length > 0 && (
            <section className="coupons-section" aria-labelledby="coupons-offers-title">
              <div className="coupons-section__head">
                <h2 id="coupons-offers-title">Ofertas com desconto automático, por loja</h2>
              </div>
              <div className="store-grid">
                {overview.blocks.map((block) => (
                  <section key={block.slug} className="store-block" aria-label={`Ofertas da ${block.name}`}>
                    <header className="store-block__head">
                      <MerchantLogo merchantId={block.merchantId} displayName={block.name} className="store-block__logo" />
                      <div>
                        <h3>
                          <Link to={`/cupons/${block.slug}/`}>{block.name}</Link>
                        </h3>
                        <span>{block.offerTotal === 1 ? '1 oferta' : `${block.offerTotal} ofertas`}</span>
                      </div>
                    </header>
                    {block.offers.map((coupon) => (
                      <OfferCard key={coupon.id} coupon={coupon} now={now} showStore={false} />
                    ))}
                    {block.offerTotal > block.offers.length && (
                      <button type="button" className="store-block__more" onClick={() => showStoreOffers(block.slug)}>
                        {`Ver as ${block.offerTotal} ofertas`}
                      </button>
                    )}
                  </section>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {!isOverview && results && (
        <>
          <div className="coupons-results__head">
            {/* com a lista de lojas na tela, o resumo vai pro "?" dela — aqui fica
                só a versão lida pelo leitor de tela, que anuncia as mudanças */}
            <p aria-live="polite" className={showChecklist ? 'sr-only' : undefined}>
              {resultSummary}
            </p>
            {hasFilters && (
              <button type="button" className="coupons-link-button" onClick={clearFilters}>
                Limpar filtros
              </button>
            )}
          </div>

          {productSearch && (
            <Link to={productSearch} className="coupons-cross">
              <TrendingDown size={18} aria-hidden="true" />
              <span>
                <strong>{`Procurar “${query}” nos produtos`}</strong>
                Compare preços e veja o histórico antes de usar o cupom.
              </span>
            </Link>
          )}

          {showChecklist && (
            <StoreChecklist
              stores={resultStores}
              excluded={excluded}
              onChange={(next) => setWithout([...next].join(','))}
              info={resultSummary}
            />
          )}

          {visibleResults.length === 0 && visibleRelated.length === 0 && (
            <p className="status">
              {results.length + related.length > 0 ? (
                'Nenhuma loja marcada. Marque ao menos uma na lista acima.'
              ) : (
                <>
                  {query ? `Nenhum cupom ou oferta com “${query}” agora. ` : 'Nenhum cupom ou oferta com esses filtros. '}
                  <Link to="/?queda=1">Ver produtos com queda de preço →</Link>
                </>
              )}
            </p>
          )}

          {visibleResults.length === 0 && visibleRelated.length > 0 && (
            <p className="coupons-note">{`Nenhum cupom cita “${query}”, mas há cupons de lojas que têm “${query}” no catálogo:`}</p>
          )}

          {shownCodes.length > 0 && (
            <section className="coupons-section" aria-label="Cupons com código">
              <h2 className="coupons-results__title">Com código</h2>
              <div className="ticket-grid">
                {shownCodes.map((coupon) => (
                  <CouponTicket key={coupon.id} coupon={coupon} now={now} />
                ))}
              </div>
            </section>
          )}

          {shownOffers.length > 0 && (
            <section className="coupons-section" aria-label="Ofertas com desconto automático">
              <h2 className="coupons-results__title">Ofertas com desconto automático</h2>
              <div className="offer-grid">
                {shownOffers.map((coupon) => (
                  <OfferCard key={coupon.id} coupon={coupon} now={now} />
                ))}
              </div>
            </section>
          )}

          {visibleResults.length > visible && (
            <button type="button" className="coupons-load-more" onClick={() => setVisible((n) => n + PAGE_SIZE)}>
              {`Carregar mais (${visibleResults.length - visible} restantes)`}
            </button>
          )}

          {visibleRelated.length > 0 && (
            <section className="coupons-section coupons-related" aria-labelledby="coupons-related-title">
              <div className="coupons-related__head">
                <h2 id="coupons-related-title" className="coupons-results__title">{`Cupons de lojas que têm “${query}”`}</h2>
                <InfoTip label="Por que essas lojas aparecem aqui?">
                  <span className="info-tip__list">
                    {relatedStores.map(([slug, name]) => (
                      <span key={slug}>{`${name}: ${selling.get(slug)} ${selling.get(slug) === 1 ? 'produto' : 'produtos'} no nosso catálogo`}</span>
                    ))}
                  </span>
                  São cupons gerais dessas lojas: confira as regras, porque nem todo cupom vale para todo produto.
                </InfoTip>
              </div>
              <div className="ticket-grid">
                {shownRelated.map((coupon) => (
                  <CouponTicket key={coupon.id} coupon={coupon} now={now} />
                ))}
              </div>
              {visibleRelated.length > shownRelated.length && (
                <button type="button" className="coupons-load-more" onClick={() => setAllRelated(true)}>
                  {`Ver todos os ${visibleRelated.length} cupons dessas lojas`}
                </button>
              )}
            </section>
          )}
        </>
      )}

      {!isOverview && !results && !failed && overview && <p className="status">Carregando cupons...</p>}

      {isOverview && summary && (
        <nav className="coupons-stores" aria-label="Cupons por loja">
          <h2>Cupons por loja</h2>
          <ul>
            {summary.stores.map((s) => (
              <li key={s.slug}>
                <Link to={`/cupons/${s.slug}/`}>
                  {s.name} <span>{s.total}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}
