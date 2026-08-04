import { useState } from 'react'
import type { PricePoint } from '../types/product'
import { formatPrice } from './ProductCard'

const WIDTH = 280
const HEIGHT = 90
const PADDING = 8
const DAY_MS = 24 * 60 * 60 * 1000
const MAX_X_LABELS = 5

// O histórico só é gravado ~1x por dia (ver scripts/update-price-history.mjs),
// então "3 meses"/"6 meses" só mostram mais pontos do que "30 dias" conforme
// dias reais forem passando — nunca extrapolamos ou inventamos ponto.
const PERIODS = [
  { key: '30d', label: '30 dias', days: 30 },
  { key: '3m', label: '3 meses', days: 90 },
  { key: '6m', label: '6 meses', days: 180 },
] as const

type PeriodKey = (typeof PERIODS)[number]['key']

function formatShortDate(iso: string) {
  const [, month, day] = iso.split('-')
  return `${day}/${month}`
}

// Datas do histórico são strings simples "YYYY-MM-DD" (ver
// scripts/update-price-history.mjs) — reformata por string mesmo, sem passar
// por Date(), pra não correr risco de fuso horário deslocar o dia (mesmo
// cuidado de src/lib/date.ts).
function formatFullDate(iso: string) {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

// Escolhe no máximo MAX_X_LABELS índices espalhados uniformemente (incluindo
// sempre o primeiro e o último ponto) — evita amontoar uma data por ponto
// quando o período tem dezenas/centenas de pontos.
function pickLabelIndices(count: number, maxLabels: number) {
  if (count <= maxLabels) return Array.from({ length: count }, (_, i) => i)
  const step = (count - 1) / (maxLabels - 1)
  return Array.from({ length: maxLabels }, (_, i) => Math.round(i * step))
}

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

  const xAt = (i: number) => PADDING + (i / (visible.length - 1)) * (WIDTH - PADDING * 2)
  const yAt = (price: number) => HEIGHT - PADDING - ((price - min) / range) * (HEIGHT - PADDING * 2)

  const coords = visible.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p.price).toFixed(1)}`)
  const areaPoints = `${xAt(0).toFixed(1)},${HEIGHT} ${coords.join(' ')} ${xAt(visible.length - 1).toFixed(1)},${HEIGHT}`

  const first = visible[0]
  const last = visible[visible.length - 1]
  const changed = last.price !== first.price
  const trendDown = last.price < first.price
  const lineColor = trendDown ? 'var(--color-green)' : 'var(--color-pink)'

  const labelIndices = pickLabelIndices(visible.length, MAX_X_LABELS)

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
      <div className="price-history__chart">
        <div className="price-history__yaxis">
          <span>{formatPrice(max, currency)}</span>
          <span>{formatPrice(min, currency)}</span>
        </div>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="price-history__svg" preserveAspectRatio="none">
          <polygon points={areaPoints} fill={lineColor} opacity="0.1" />
          <polyline points={coords.join(' ')} fill="none" stroke={lineColor} strokeWidth="2" />
        </svg>
      </div>
      <div className="price-history__xaxis">
        {labelIndices.map((i) => (
          <span key={i}>{formatShortDate(visible[i].date)}</span>
        ))}
      </div>
      <p className="price-history__caption">
        {changed
          ? `${trendDown ? 'Caiu' : 'Subiu'} de ${formatPrice(first.price, currency)} (${formatFullDate(first.date)}) para ${formatPrice(last.price, currency)} (${formatFullDate(last.date)}).`
          : `Estável em ${formatPrice(last.price, currency)} desde ${formatFullDate(first.date)}.`}
      </p>
    </div>
  )
}
