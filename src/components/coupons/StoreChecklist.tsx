import { useId, type ReactNode } from 'react'
import { InfoTip } from './InfoTip'

export interface ChecklistStore {
  slug: string
  name: string
  count: number
}

// Lojas que aparecem no resultado da busca, todas marcadas de início: o visitante
// desmarca o que não quer ver. `excluded` guarda só as desmarcadas. `info` (o
// resumo da busca) fica no "?" ao lado do título.
export function StoreChecklist({
  stores,
  excluded,
  onChange,
  info,
}: {
  stores: ChecklistStore[]
  excluded: Set<string>
  onChange: (next: Set<string>) => void
  info?: ReactNode
}) {
  const titleId = useId()
  const checked = stores.filter((s) => !excluded.has(s.slug)).length

  function toggle(slug: string) {
    const next = new Set(excluded)
    if (!next.delete(slug)) next.add(slug)
    onChange(next)
  }

  return (
    <div className="store-checks" role="group" aria-labelledby={titleId}>
      <div className="store-checks__head">
        <strong id={titleId}>Lojas nos resultados</strong>
        {info && <InfoTip label="Resumo dos resultados da busca">{info}</InfoTip>}
      </div>
      <div className="store-checks__actions">
        <span aria-live="polite">{`${checked} de ${stores.length} marcadas`}</span>
        <button type="button" className="coupons-link-button" onClick={() => onChange(new Set())} disabled={checked === stores.length}>
          Marcar todas
        </button>
        <button
          type="button"
          className="coupons-link-button"
          onClick={() => onChange(new Set(stores.map((s) => s.slug)))}
          disabled={checked === 0}
        >
          Desmarcar todas
        </button>
      </div>
      <div className="store-checks__list">
        {stores.map((s) => (
          <label key={s.slug} className="store-check">
            <input type="checkbox" checked={!excluded.has(s.slug)} onChange={() => toggle(s.slug)} />
            <span>{s.name}</span>
            <small>{s.count}</small>
          </label>
        ))}
      </div>
    </div>
  )
}
