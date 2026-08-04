import { useState } from 'react'
import type { PricePoint } from '../types/product'
import { formatPrice } from './ProductCard'

const WIDTH = 280
const HEIGHT = 80
const PADDING = 8
const DAY_MS = 24 * 60 * 60 * 1000

// O histórico só é gravado ~1x por dia (ver scripts/update-price-history.mjs),
// então "3 meses"/"6 meses" só mostram mais pontos do que "30 dias" conforme
// dias reais forem passando — nunca extrapolamos ou inventamos ponto.
const PERIODS = [
  { key: '30d', label: '30 dias', days: 30 },
  { key: '3m', label: '3 meses', days: 90 },
  { key: '6m', label: '6 meses', days: 180 },
] as const

type PeriodKey = (typeof PERIODS)[number]['key']

export function PriceHistoryChart({ points, currency }: { points: PricePoint[]; currency: string }) {
  const [period, setPeriod] = useState<PeriodKey>('30d')

  if (points.length < 2) return null

  const now = Date.now()
  const selectedDays = PERIODS.find((p) => p.key === period)!.days
  const filtered = points.filter((p) => (now - new Date(p.date).getTime()) / DAY_MS <= selectedDays)
  // Se o período escolhido não tem pontos suficientes ainda (histórico recente
  // demais), cai pra série completa em vez de mostrar um gráfico vazio/reto.
  const visible = filtered.length >= 2 ? filtered : points

  const prices = visible.map((p) => p.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 1

  const coords = visible.map((p, i) => {
    const x = PADDING + (i / (visible.length - 1)) * (WIDTH - PADDING * 2)
    const y = HEIGHT - PADDING - ((p.price - min) / range) * (HEIGHT - PADDING * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const first = visible[0]
  const last = visible[visible.length - 1]
  const changed = last.price !== first.price
  const trendDown = last.price < first.price

  return (
    <div className="price-history">
      <div className="price-history__header">
        <h2>Histórico de preço</h2>
        <div className="price-history__periods">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`price-history__period${period === p.key ? ' price-history__period--active' : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="price-history__svg" preserveAspectRatio="none">
        <polyline
          points={coords.join(' ')}
          fill="none"
          stroke={trendDown ? 'var(--color-green)' : 'var(--color-pink)'}
          strokeWidth="2"
        />
      </svg>
      <p className="price-history__caption">
        {changed
          ? `${trendDown ? 'Caiu' : 'Subiu'} de ${formatPrice(first.price, currency)} (${first.date}) para ${formatPrice(last.price, currency)} (${last.date}).`
          : `Estável em ${formatPrice(last.price, currency)} desde ${first.date}.`}
      </p>
    </div>
  )
}
