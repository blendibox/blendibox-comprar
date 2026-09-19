import { SeasonalIcon } from './SeasonalIcon'
import { getSeasonalEvent, seasonalVerticals } from '../lib/seasonalEvents'
import { useSeasonalTheme } from '../lib/useSeasonalTheme'

// Tag do evento na página do produto. `eligible` é a regra que sustenta a
// honestidade da campanha: só aparece quando o produto tem queda de preço
// confirmada pelo nosso histórico (ou cupom ativo da loja) — nunca em todo
// produto só porque é época de promoção. Datas com departamentos (Dia das Mães:
// joias, beleza e casa) também exigem que o produto seja de um deles — um tênis
// masculino em queda não ganha tag de Dia das Mães. Eventos sem `tag` na tabela
// (e a fase de "esquenta") não mostram nada.
export function SeasonalTag({ eligible, vertical }: { eligible: boolean; vertical: string }) {
  const event = getSeasonalEvent(useSeasonalTheme())
  if (!eligible || !event?.tag) return null
  const verticals = seasonalVerticals(event)
  if (verticals && !verticals.includes(vertical)) return null

  return (
    <div className="product-detail__event">
      <span
        className={`seasonal-tag seasonal-theme--${event.palette}`}
        title="Queda de preço confirmada pelo histórico do Compare Ofertas"
      >
        <SeasonalIcon name={event.icon} size={14} strokeWidth={2.5} aria-hidden="true" />
        {event.tag.lead} <span className="seasonal-tag__accent">{event.tag.accent}</span>
      </span>
    </div>
  )
}
