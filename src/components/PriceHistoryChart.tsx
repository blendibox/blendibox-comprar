import type { PricePoint } from '../types/product'
import { formatPrice } from './ProductCard'

const WIDTH = 280
const HEIGHT = 80
const PADDING = 8

export function PriceHistoryChart({ points, currency }: { points: PricePoint[]; currency: string }) {
  if (points.length < 2) return null

  const prices = points.map((p) => p.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 1

  const coords = points.map((p, i) => {
    const x = PADDING + (i / (points.length - 1)) * (WIDTH - PADDING * 2)
    const y = HEIGHT - PADDING - ((p.price - min) / range) * (HEIGHT - PADDING * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const first = points[0]
  const last = points[points.length - 1]
  const changed = last.price !== first.price
  const trendDown = last.price < first.price

  return (
    <div className="price-history">
      <h2>Histórico de preço</h2>
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
