import { useEffect, useState } from 'react'
import { Link } from '../components/Link'
import { ProductCard } from '../components/ProductCard'
import { SeasonalIcon } from '../components/SeasonalIcon'
import { ChevronDown, Gift, ShieldCheck } from '../components/Icon'
import { fetchTopPriceDrops } from '../lib/api'
import { clearInitialData, peekInitialData } from '../lib/initialData'
import {
  LANDING_MAX_ITEMS,
  brazilYear,
  daysUntil,
  getSeasonalEvent,
  getSeasonalLanding,
  selectDrops,
  type SeasonalLandingId,
} from '../lib/seasonalEvents'
import { timeAgo } from '../lib/timeAgo'
import { useSeasonalTheme } from '../lib/useSeasonalTheme'
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
  // Texto de apoio do card do topo: aberto no desktop, recolhido no celular
  // (regra no CSS; este estado só vale no celular). Começa fechado igual no
  // servidor e no cliente — não muda a hidratação.
  const [leadOpen, setLeadOpen] = useState(false)

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
  const minDrop = data?.minDropPercent ?? 10
  const minHistory = data?.minHistoryDays ?? 45
  // Só depois de montar (o tema é null no servidor e na primeira renderização)
  const event = getSeasonalEvent(useSeasonalTheme())
  const eventName = page.eventEyebrow && event?.landing === page.id ? event.banner.badge : null

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
          {eventName && ` · ${eventName}`}
        </span>
        <h1>{page.title}</h1>
        {page.tagline && <p className="seasonal-landing__tagline">{page.tagline}</p>}
        <div className={`seasonal-landing__lead-wrap${leadOpen ? ' is-open' : ''}`}>
          <button
            type="button"
            className="seasonal-landing__lead-toggle"
            aria-expanded={leadOpen}
            aria-controls="seasonal-landing-lead"
            onClick={() => setLeadOpen((open) => !open)}
          >
            {leadOpen ? 'Fechar' : 'Saiba mais'}
            <ChevronDown size={16} aria-hidden="true" />
          </button>
          <p id="seasonal-landing-lead" className="seasonal-landing__lead">
            {page.lead}
          </p>
        </div>
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

      {/* Recolhido por padrão (no celular o texto ocupava a primeira tela
          inteira). <details> nativo: abre com teclado/toque sem JS, e o texto
          continua no HTML estático. */}
      <details className="seasonal-landing__verify">
        <summary>
          <ShieldCheck size={22} aria-hidden="true" />
          <strong>Como a gente verifica</strong>
          <span className="seasonal-landing__verify-toggle">
            <span className="seasonal-landing__verify-toggle-closed">Saiba mais</span>
            <span className="seasonal-landing__verify-toggle-open">Fechar</span>
            <ChevronDown size={18} aria-hidden="true" />
          </span>
        </summary>
        <div className="seasonal-landing__verify-body">
          <p className="seasonal-landing__verify-key">Não comparamos apenas com o preço anterior.</p>
          <p>
            Para identificar uma queda, comparamos o preço atual com o preço habitual do produto — o que ele custou na
            maior parte dos últimos meses de monitoramento (até 90 dias) — e não com o preço de uma semana atrás. Só
            entra aqui quem cumpre tudo isto:
          </p>
          <ul className="seasonal-landing__verify-list">
            <li>preço atual pelo menos {minDrop}% abaixo do preço habitual;</li>
            <li>o menor preço que já monitoramos para o produto;</li>
            <li>pelo menos {minHistory} dias de histórico;</li>
            <li>sem pico artificial de preço no período e sem nenhuma subida nos últimos 30 dias.</li>
          </ul>
          <p>
            Quedas acima de 80% são desconsideradas porque podem indicar erro ou inconsistência de preço na loja, e não
            uma redução real.
          </p>
          <p className="seasonal-landing__verify-sum">
            Aqui você vê quanto o preço caiu em relação ao histórico que monitoramos pra você.
          </p>
        </div>
      </details>

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
