import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { PricePoint } from '../types/product'
import { formatPrice } from './ProductCard'
import { formatSimpleDateBr } from '../lib/date'

const WIDTH = 280
const HEIGHT = 90
const PADDING = 8
const DAY_MS = 24 * 60 * 60 * 1000
const MAX_X_LABELS = 5

// O histórico é gravado só quando o preço MUDA (ver update-price-history.mjs),
// então a série é esparsa. O gráfico desenha uma função-DEGRAU num eixo X
// TEMPORAL: o preço fica reto até a data em que mudou, aí "pula" pro novo
// valor — refletindo com fidelidade que a mudança foi súbita, não gradual.
const PERIODS = [
  { key: '30d', label: '30 dias', days: 30 },
  { key: '3m', label: '3 meses', days: 90 },
  { key: '6m', label: '6 meses', days: 180 },
] as const

type PeriodKey = (typeof PERIODS)[number]['key'] | 'all'

const dateMs = (iso: string) => new Date(`${iso}T00:00:00`).getTime()
const isoOf = (ms: number) => new Date(ms).toISOString().slice(0, 10)

function formatShortDate(iso: string) {
  const [, month, day] = iso.split('-')
  return `${day}/${month}`
}

// Dia anterior de uma data "YYYY-MM-DD", em UTC puro (sem fuso do navegador).
function previousDay(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10)
}

export function PriceHistoryChart({
  points,
  currency,
  currentPrice: currentPriceProp,
  habitualPrice,
  dropPercent,
}: {
  points: PricePoint[]
  currency: string
  currentPrice?: number | null
  // Preço habitual (mediana dos últimos meses) e a queda contra ele — quando o
  // produto tem uma queda válida (src/lib/priceDrop.ts). A legenda passa a
  // dizer isso em vez de "caiu de X", que, num sobe e desce (pico de preço e
  // volta ao normal), parecia desconto.
  habitualPrice?: number | null
  dropPercent?: number | null
}) {
  const [period, setPeriod] = useState<PeriodKey>('30d')
  // "Agora" só é definido depois de montado no cliente. No servidor
  // (prerender) e na primeira renderização do cliente (hidratação) não existe
  // um "agora" estável — Date.now() muda entre o momento do build e o
  // carregamento da página, e como o eixo do gráfico depende disso, os pixels
  // calculados no cliente divergiam do HTML do servidor e quebravam a
  // hidratação (erro #418) em praticamente toda página de produto. Adiando
  // pro useEffect, servidor e a 1a renderização do cliente concordam em "sem
  // gráfico ainda" — ele aparece um instante depois, já com o tempo real.
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
  }, [])

  // Balão com o preço e o período do ponto tocado/apontado no gráfico. Guarda só o
  // INSTANTE (ms) sob o ponteiro; o resto (preço, datas, posição) sai da própria série.
  // Nas gravações de sessão (Clarity) havia gente clicando várias vezes no gráfico pra
  // ler o preço de um trecho — ele não respondia a nada.
  const [hoverT, setHoverT] = useState<number | null>(null)
  const plotRef = useRef<HTMLDivElement>(null)
  const isHovering = hoverT != null
  // No toque não existe "sair de cima": o balão fica até a pessoa tocar fora do gráfico.
  useEffect(() => {
    if (!isHovering) return
    const dismiss = (e: PointerEvent) => {
      if (plotRef.current && !plotRef.current.contains(e.target as Node)) setHoverT(null)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [isHovering])

  if (points.length < 2 || now == null) return null

  const sorted = [...points].sort((a, b) => dateMs(a.date) - dateMs(b.date))
  const firstMs = dateMs(sorted[0].date)
  const fullSpanDays = (now - firstMs) / DAY_MS

  // Só oferece as abas fixas (30/90/180 dias) que realmente cortariam algo do
  // que já temos rastreado — evita mostrar "3 meses" e "6 meses" idênticos a
  // "30 dias" quando o produto ainda tem pouco histórico (visto em gravações
  // de sessão: gente clicando entre as abas tentando achar uma diferença que
  // não existe). "Tudo" só aparece junto quando há pelo menos um corte
  // significativo pra comparar — sem isso, não faz sentido nenhuma aba.
  const truncatingPeriods = PERIODS.filter((p) => p.days < fullSpanDays)
  const showPeriodSwitcher = truncatingPeriods.length > 0
  const periodTabs: { key: PeriodKey; label: string }[] = showPeriodSwitcher
    ? [...truncatingPeriods, { key: 'all', label: 'Tudo' }]
    : []

  const days = period === 'all' ? null : PERIODS.find((p) => p.key === period)?.days ?? 30
  const windowStart = days == null ? -Infinity : now - days * DAY_MS

  const todayIso = isoOf(now)
  // Preço atual DEFINITIVO = o searchPrice do produto (o valor exibido na
  // página). O último ponto GRAVADO pode estar defasado (gravação é diária no
  // cron), então ele NÃO manda no fim da linha — quem manda é o preço da
  // página. Assim o gráfico sempre termina no mesmo valor da legenda e do topo.
  const currentPrice = currentPriceProp != null ? currentPriceProp : sorted[sorted.length - 1].price

  // Início do eixo: a janela escolhida, ou a entrada do produto se for mais
  // recente que a janela (não inventa período que ainda não existe).
  const t0 = Math.max(windowStart, firstMs)
  const t1 = now
  const span = t1 - t0 || 1

  // Série visível como degrau dentro de [t0, t1]: âncora inicial com o preço
  // vigente em t0 (carry-forward do último ponto <= t0), as mudanças dentro da
  // janela, e o preço atual estendido até agora. Pontos gravados HOJE são
  // ignorados: o preço de hoje é o currentPrice (searchPrice), não um registro
  // que pode ter ficado defasado.
  const visible: PricePoint[] = []
  let carry = sorted[0].price
  // Desde quando o preço de abertura (carry) vale de verdade: a âncora inicial usa a data
  // da janela (pro eixo), mas o balão deve dizer a data real em que esse preço apareceu.
  let carryDate = sorted[0].date
  for (const p of sorted) {
    const ms = dateMs(p.date)
    if (ms <= t0) {
      carry = p.price
      carryDate = p.date
      continue
    }
    if (ms > t1) break
    if (p.date === todayIso) continue
    if (visible.length === 0) visible.push({ date: isoOf(t0), price: carry })
    visible.push(p)
  }
  if (visible.length === 0) visible.push({ date: isoOf(t0), price: carry })
  // Âncora final: sempre o preço atual, estendido até agora.
  visible.push({ date: todayIso, price: currentPrice })

  if (visible.length < 2) return null

  const prices = visible.map((p) => p.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 1

  const plotWidth = WIDTH - PADDING * 2
  const xOfMs = (ms: number) => PADDING + ((ms - t0) / span) * plotWidth
  const xAt = (iso: string) => xOfMs(dateMs(iso))
  const yAt =(price: number) => HEIGHT - PADDING - ((price - min) / range) * (HEIGHT - PADDING * 2)

  // Coordenadas em degrau: horizontal (preço anterior até a nova data), depois
  // vertical (pulo pro novo preço).
  const coords: string[] = []
  visible.forEach((p, i) => {
    const x = xAt(p.date)
    if (i > 0) coords.push(`${x.toFixed(1)},${yAt(visible[i - 1].price).toFixed(1)}`)
    coords.push(`${x.toFixed(1)},${yAt(p.price).toFixed(1)}`)
  })
  const x0 = xAt(visible[0].date)
  const xLast = xAt(visible[visible.length - 1].date)
  const areaPoints = `${x0.toFixed(1)},${HEIGHT} ${coords.join(' ')} ${xLast.toFixed(1)},${HEIGHT}`

  const last = visible[visible.length - 1]
  // Preço distinto anterior ao atual (a última variação) — descreve o
  // movimento mais recente, não só primeiro×último (que erra quando o preço
  // sobe e volta pro mesmo valor).
  let prevDistinct: number | null = null
  for (let i = visible.length - 2; i >= 0; i--) {
    if (visible[i].price !== last.price) {
      prevDistinct = visible[i].price
      break
    }
  }
  const trendDown = prevDistinct != null && last.price < prevDistinct
  const lineColor = trendDown ? 'var(--color-green)' : 'var(--color-pink)'

  // Rótulos do eixo X: datas igualmente espaçadas no TEMPO (não por ponto).
  const labels = Array.from({ length: MAX_X_LABELS }, (_, i) =>
    isoOf(t0 + (span * i) / (MAX_X_LABELS - 1))
  )

  // Balão: acha o degrau sob o ponteiro (último ponto com data <= instante) e junta os
  // pontos vizinhos de MESMO preço num período só (ex.: a última mudança gravada + a
  // âncora de hoje, que têm o mesmo valor, viram "desde 18/10").
  let tip: { price: string; period: string; current: boolean; leftPct: number; topPct: number } | null = null
  if (hoverT != null) {
    const t = Math.min(Math.max(hoverT, t0), t1)
    let idx = 0
    for (let i = 0; i < visible.length; i++) {
      if (dateMs(visible[i].date) <= t) idx = i
      else break
    }
    const price = visible[idx].price
    let from = idx
    while (from > 0 && visible[from - 1].price === price) from--
    let to = idx
    while (to < visible.length - 1 && visible[to + 1].price === price) to++

    const startIso = from === 0 ? carryDate : visible[from].date
    const isCurrent = to === visible.length - 1
    const thisYear = new Date(now).getFullYear()
    const fmt = (iso: string) => (Number(iso.slice(0, 4)) === thisYear ? formatShortDate(iso) : formatSimpleDateBr(iso))
    let period: string
    if (isCurrent) {
      period = `desde ${fmt(startIso)}`
    } else {
      // A mudança foi GRAVADA na data do próximo ponto: o preço antigo foi visto até o dia anterior.
      const endIso = previousDay(visible[to + 1].date)
      period = startIso === endIso ? `em ${fmt(startIso)}` : `de ${fmt(startIso)} a ${fmt(endIso)}`
    }
    tip = {
      price: formatPrice(price, currency),
      period,
      current: isCurrent,
      leftPct: (xOfMs(t) / WIDTH) * 100,
      topPct: (yAt(price) / HEIGHT) * 100,
    }
  }

  const moveHover = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    if (rect.width <= 0) return
    const svgX = ((e.clientX - rect.left) / rect.width) * WIDTH
    const u = Math.min(Math.max((svgX - PADDING) / plotWidth, 0), 1)
    setHoverT(t0 + u * span)
  }

  return (
    <div className="price-history">
      <div className="price-history__header">
        <h2>Histórico de preço</h2>
        {showPeriodSwitcher && (
          <div className="price-history__periods">
            {periodTabs.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`price-history__period${period === p.key ? ' price-history__period--active' : ''}`}
                onClick={() => {
                  setPeriod(p.key)
                  setHoverT(null)
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="price-history__chart">
        <div className="price-history__yaxis">
          <span>{formatPrice(max, currency)}</span>
          <span>{formatPrice(min, currency)}</span>
        </div>
        <div
          ref={plotRef}
          className="price-history__plot"
          onPointerDown={moveHover}
          onPointerMove={moveHover}
          onPointerLeave={(e) => {
            if (e.pointerType === 'mouse') setHoverT(null)
          }}
        >
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="price-history__svg" preserveAspectRatio="none">
            <polygon points={areaPoints} fill={lineColor} opacity="0.1" />
            <polyline points={coords.join(' ')} fill="none" stroke={lineColor} strokeWidth="2" />
          </svg>
          {tip && (
            <>
              <span className="price-history__guide" style={{ left: `${tip.leftPct}%` }} aria-hidden="true" />
              <span
                className="price-history__dot"
                style={{ left: `${tip.leftPct}%`, top: `${tip.topPct}%`, background: lineColor }}
                aria-hidden="true"
              />
              <div
                className={`price-history__tip${tip.leftPct < 28 ? ' price-history__tip--left' : tip.leftPct > 72 ? ' price-history__tip--right' : ''}`}
                style={tip.leftPct >= 28 && tip.leftPct <= 72 ? { left: `${tip.leftPct}%` } : undefined}
                aria-hidden="true"
              >
                <strong>{tip.price}</strong>
                <span>{tip.period}</span>
                {tip.current && <em>preço atual</em>}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="price-history__xaxis">
        {labels.map((iso, i) => (
          <span key={i}>{formatShortDate(iso)}</span>
        ))}
      </div>
      <p className="price-history__caption">
        {habitualPrice != null && dropPercent != null
          ? `Preço habitual ${formatPrice(habitualPrice, currency)} · hoje ${formatPrice(last.price, currency)} (${dropPercent}% abaixo).`
          : prevDistinct == null
            ? `Estável em ${formatPrice(last.price, currency)}.`
            : `${trendDown ? 'Passou' : 'Subiu'} de ${formatPrice(prevDistinct, currency)} para ${formatPrice(last.price, currency)} (${formatSimpleDateBr(last.date)}).`}
      </p>
    </div>
  )
}
