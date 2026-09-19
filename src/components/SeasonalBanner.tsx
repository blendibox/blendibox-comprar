import { Link } from './Link'
import { SeasonalIcon } from './SeasonalIcon'
import { brazilYear, getSeasonalEvent } from '../lib/seasonalEvents'
import { useSeasonalTheme } from '../lib/useSeasonalTheme'

// Faixa fina acima do menu nas datas comemorativas (tabela em
// lib/seasonalEvents.ts).
//
// O <div class="seasonal-slot"> sempre existe no HTML (vazio, altura 0) e o
// conteúdo só entra depois de montar. A altura é reservada ANTES da pintura
// por um atributo que o prerender.mjs coloca no <html> quando o build cai
// dentro de uma campanha (html[data-season] .seasonal-slot no CSS) — assim o
// banner aparece sem empurrar a página pra baixo (CLS). Sem o atributo (dia
// da virada, antes do próximo deploy, ou ?tema= de teste) só perde a reserva:
// funciona igual, com um pequeno deslocamento.
export function SeasonalBanner() {
  const event = getSeasonalEvent(useSeasonalTheme())
  if (!event) return <div className="seasonal-slot" />

  const { banner } = event
  return (
    <div className="seasonal-slot">
      <div className={`seasonal-banner seasonal-theme--${event.palette}${event.soft ? ' seasonal-banner--soft' : ''}`}>
        <div className="seasonal-banner__inner">
          <span className="seasonal-banner__badge">
            <SeasonalIcon name={event.icon} size={16} strokeWidth={2.5} aria-hidden="true" />
            <span className="seasonal-banner__badge-full">{banner.badge}</span>
            <span className="seasonal-banner__badge-short">{banner.badgeShort ?? banner.badge}</span>
          </span>
          <span className="seasonal-banner__text">
            <strong>{banner.headline(brazilYear())}</strong>
            <span className="seasonal-banner__sub">{banner.sub}</span>
          </span>
          <Link className="seasonal-banner__cta" to={banner.to}>
            {banner.cta}
            <span aria-hidden="true"> →</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
