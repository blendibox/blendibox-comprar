import { useEffect, useState } from 'react'
import type { PricePoint } from '../types/product'
import { formatPrice } from './ProductCard'

const WIDTH = 640
const HEIGHT = 200
const PADDING = 10
const DAY_MS = 24 * 60 * 60 * 1000
const MAX_X_LABELS = 6

// Cores fixas por série (não é sobe/desce como no gráfico individual — aqui
// cada cor identifica um produto, então precisa ficar estável mesmo se o
// preço subir ou descer).
const SERIES_COLORS = ['var(--color-teal)', 'var(--color-pink)', 'var(--color-green)']

const PERIODS = [
  { key: '30d', label: '30 dias', days: 30 },
  { key: '3m', label: '3 meses', days: 90 },
  { key: '6m', label: '6 meses', days: 180 },
] as const

type PeriodKey = (typeof PERIODS)[number]['key']

const dateMs = (iso: string) => new Date(`${iso}T00:00:00`).getTime()
const isoOf = (ms: number) => new Date(ms).toISOString().slice(0, 10)

function formatShortDate(iso: string) {
  const [, month, day] = iso.split('-')
  return `${day}/${month}`
}

export type CompareSeries = {
  key: string
  label: string
  currentPrice: number
  points: PricePoint[]
}

export function CompareChart({ series, currency }: { series: CompareSeries[]; currency: string }) {
  const [period, setPeriod] = useState<PeriodKey>('30d')
  // Mesmo motivo do gráfico individual (PriceHistoryChart): Date.now() direto
  // no corpo do componente divergiria entre o servidor e a hidratação do
  // cliente. Aqui na prática o `series` já chega vazio nos dois lados (só
  // popula depois de um fetch em useEffect na página Comparar), então o risco
  // é baixo — mas manter o mesmo padrão evita reintroduzir o bug se isso
  // mudar no futuro.
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
  }, [])

  // Só entra na comparação quem tem pelo menos 2 pontos de histórico — os
  // demais aparecem só como preço atual nos cards, sem entrar no gráfico.
  const usable = series.filter((s) => s.points.length > 1)
  if (usable.length === 0 || now == null) return null

  const days = PERIODS.find((p) => p.key === period)!.days
  const windowStart = now - days * DAY_MS
  const t1 = now

  // Início do eixo: a janela escolhida, ou a entrada do produto mais antigo
  // entre os selecionados, se for mais recente que a janela.
  const firstMs = Math.min(...usable.map((s) => dateMs([...s.points].sort((a, b) => dateMs(a.date) - dateMs(b.date))[0].date)))
  const t0 = Math.max(windowStart, firstMs)
  const span = t1 - t0 || 1

  const built = usable.map((s, i) => {
    const sorted = [...s.points].sort((a, b) => dateMs(a.date) - dateMs(b.date))
    const todayIso = isoOf(t1)
    const visible: PricePoint[] = []
    let carry = sorted[0].price
    for (const p of sorted) {
      const ms = dateMs(p.date)
      if (ms <= t0) {
        carry = p.price
        continue
      }
      if (ms > t1) break
      if (p.date === todayIso) continue
      if (visible.length === 0) visible.push({ date: isoOf(t0), price: carry })
      visible.push(p)
    }
    if (visible.length === 0) visible.push({ date: isoOf(t0), price: carry })
    // Âncora final: sempre o preço atual real do produto (o mesmo exibido no
    // card), nunca o último ponto gravado — evita a linha "pular" pra um
    // valor defasado se o histórico não foi atualizado no mesmo instante.
    visible.push({ date: todayIso, price: s.currentPrice })
    return { ...s, color: SERIES_COLORS[i % SERIES_COLORS.length], visible }
  })

  const allPrices = built.flatMap((b) => b.visible.map((p) => p.price))
  const min = Math.min(...allPrices)
  const max = Math.max(...allPrices)
  const range = max - min || 1

  const xAt = (iso: string) => PADDING + ((dateMs(iso) - t0) / span) * (WIDTH - PADDING * 2)
  const yAt = (price: number) => HEIGHT - PADDING - ((price - min) / range) * (HEIGHT - PADDING * 2)

  const labels = Array.from({ length: MAX_X_LABELS }, (_, i) => isoOf(t0 + (span * i) / (MAX_X_LABELS - 1)))

  return (
    <div className="compare-chart">
      <div className="price-history__header">
        <h2>Variação de preço no período</h2>
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
          {built.map((b) => {
            const coords: string[] = []
            b.visible.forEach((p, i) => {
              const x = xAt(p.date)
              if (i > 0) coords.push(`${x.toFixed(1)},${yAt(b.visible[i - 1].price).toFixed(1)}`)
              coords.push(`${x.toFixed(1)},${yAt(p.price).toFixed(1)}`)
            })
            return <polyline key={b.key} points={coords.join(' ')} fill="none" stroke={b.color} strokeWidth="2" />
          })}
        </svg>
      </div>
      <div className="price-history__xaxis">
        {labels.map((iso, i) => (
          <span key={i}>{formatShortDate(iso)}</span>
        ))}
      </div>
      <div className="compare-chart__legend">
        {built.map((b) => (
          <span key={b.key} className="compare-chart__legend-item">
            <span className="compare-chart__legend-swatch" style={{ background: b.color }} aria-hidden="true" />
            {b.label} · {formatPrice(b.currentPrice, currency)}
          </span>
        ))}
      </div>
    </div>
  )
}
