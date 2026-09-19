import { useEffect, useState } from 'react'
import { Link } from '../components/Link'
import { ProductCard } from '../components/ProductCard'
import { SeasonalIcon } from '../components/SeasonalIcon'
import { Gift, ShieldCheck } from '../components/Icon'
import { fetchTopPriceDrops } from '../lib/api'
import { clearInitialData, peekInitialData } from '../lib/initialData'
import {
  LANDING_MAX_ITEMS,
  brazilYear,
  daysUntil,
  getSeasonalLanding,
  selectDrops,
  type SeasonalLandingId,
} from '../lib/seasonalEvents'
import { timeAgo } from '../lib/timeAgo'
import type { SeasonalDropsSlice } from '../types/product'

// Páginas de campanha (/black-friday/, /dia-das-maes/...): as maiores quedas de
// preço CONFIRMADAS pelo histórico (top-price-drops.json), no catálogo todo ou
// só nos departamentos da época. Conteúdo, rotas e departamentos vêm de
// SEASONAL_LANDINGS (lib/seasonalEvents.ts).
function statusLine(landing: ReturnType<typeof getSeasonalLanding>, now: Date): string | null {
  if (!landing.countdown) return null
  const { month, day } = landing.countdown.date(brazilYear(now))
  const days = daysUntil(month, day, now)
  const { noun, showDate } = landing.countdown
  const date = showDate ? ` (${day}/${String(month).padStart(2, '0')})` : ''
  const Noun = noun.charAt(0).toUpperCase() + noun.slice(1)
  if (days > 1) return `Faltam ${days} dias para ${noun}${date}.`
  if (days === 1) return `${Noun} é amanhã${date}.`
  if (days === 0) return `${Noun} é hoje.`
  return null
}

export function SeasonalLandingPage({ id }: { id: SeasonalLandingId }) {
  const page = getSeasonalLanding(id)
  // Mesmo padrão da home (ListingPage): o prerender injeta a fatia desta
  // página, o primeiro render do cliente usa ela (bate com o HTML estático,
  // sem erro de hidratação) e o fetch só atualiza depois.
  const [data, setData] = useState<SeasonalDropsSlice | null>(() => peekInitialData<SeasonalDropsSlice>(page.path))
  // Contagem regressiva e "atualizado há X" dependem do momento atual — só
  // definidos depois de montar, senão o cliente divergiria do HTML estático
  // (erro de hidratação #418).
  const [status, setStatus] = useState<string | null>(null)
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    clearInitialData(page.path)
  }, [page.path])

  useEffect(() => {
    fetchTopPriceDrops()
      .then((file) => setData(selectDrops(file, page.verticals, LANDING_MAX_ITEMS)))
      .catch(() => {})
  }, [page])

  useEffect(() => {
    const current = new Date()
    setStatus(statusLine(page, current))
    setNow(current.getTime())
  }, [page])

  const items = data?.items ?? []

  return (
    <div className="page seasonal-landing">
      <nav className="breadcrumbs">
        <Link to="/">Início</Link>
        {' › '}
        <span>{page.breadcrumb}</span>
      </nav>

      <header className={`seasonal-landing__hero seasonal-theme--${page.palette}`}>
        <span className="seasonal-landing__eyebrow">
          <SeasonalIcon name={page.icon} size={16} strokeWidth={2.5} aria-hidden="true" />
          {page.eyebrow}
        </span>
        <h1>{page.title}</h1>
        <p className="seasonal-landing__lead">{page.lead}</p>
        {status && <p className="seasonal-landing__status">{status}</p>}
      </header>

      {page.registryCta && (
        <section className="seasonal-landing__registry">
          <Gift size={22} aria-hidden="true" />
          <div>
            <strong>Vai casar? Monte sua lista de presentes.</strong>
            <p>
              Escolha itens de várias lojas, compartilhe um link só e cada convidado compara o preço antes de
              comprar. Sem criar conta.
            </p>
          </div>
          <Link className="seasonal-landing__registry-cta" to="/lista-de-presentes/">
            Criar minha lista →
          </Link>
        </section>
      )}

      <section className="seasonal-landing__verify">
        <ShieldCheck size={22} aria-hidden="true" />
        <div>
          <strong>Como a gente verifica</strong>
          <p>
            Todo dia comparamos o preço de cada produto com o histórico que monitoramos. Só listamos queda de{' '}
            {data?.minDropPercent ?? 10}% ou mais em relação ao preço de cerca de 7 dias atrás. Variações acima de
            80% ficam de fora — quase sempre são erro de preço na loja, não desconto de verdade.
          </p>
        </div>
      </section>

      {data === null && <p className="status">Carregando ofertas...</p>}

      {data !== null && items.length === 0 && (
        <p className="status">
          Ainda não temos quedas confirmadas nesse grupo hoje — os preços são verificados todo dia. Enquanto isso, veja
          as <Link to="/quedas-de-preco/">maiores quedas de todas as lojas</Link>.
        </p>
      )}

      {items.length > 0 && data && (
        <>
          <p className="page__meta">
            {items.length === data.total
              ? `${data.total.toLocaleString('pt-BR')} produtos com queda confirmada`
              : `As ${items.length} maiores quedas, entre ${data.total.toLocaleString('pt-BR')} produtos com queda confirmada`}
            {now !== null && ` · atualizado ${timeAgo(data.generatedAt, now)}`}
          </p>
          <div className="product-grid">
            {items.map((product, i) => (
              <ProductCard key={`${product.merchantSlug}-${product.slug}`} product={product} priority={i === 0} />
            ))}
          </div>
        </>
      )}

      <p className="seasonal-landing__more">
        Procurando desconto na hora de pagar? Veja os <Link to="/cupons/">cupons ativos</Link> das lojas parceiras.
      </p>
    </div>
  )
}
