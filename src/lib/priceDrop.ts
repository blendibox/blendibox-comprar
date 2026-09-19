// Regra única de "queda de preço" do Compare Ofertas — pura (sem React nem Node),
// usada por scripts/update-price-history.mjs (compilada com esbuild, mesma
// técnica de scripts/lib/seasonal.mjs) e, se preciso, pelo próprio site.
//
// Por que existe: comparar só com o preço de ~7 dias atrás cai na armadilha do
// "sobe e desce". Caso real (Kaspersky, Kabum): R$ 29,99 → 87,90 → 29,99 →
// 87,90 → 25,99. Contra o preço de uma semana atrás (o pico) a "queda" era de
// 70%; contra o preço habitual do produto (~R$ 30) é de 13%.
//
// Então a queda é medida contra o PREÇO HABITUAL (mediana dos últimos até 90
// dias), e ainda existe um selo mais rígido ("verificada") que só as páginas de
// campanha, o vídeo e o Telegram usam. A "régua": quanto mais dias de
// monitoramento, mais confiança — menos de 1 mês não conta; 3 meses é bom
// sinal; 6 meses ou 1 ano é o de verdade (o histórico daqui começa em
// 12/07/2026, então esse degrau só existe a partir de janeiro de 2027).

import type { PricePoint } from '../types/product'

// Janela do preço habitual
export const REFERENCE_WINDOW_DAYS = 90
// A queda precisa ser recente: o preço de N dias atrás tem que ser maior
export const RECENT_DROP_DAYS = 7
// Selo comum ("X% essa semana"): queda mínima e histórico mínimo pra a mediana
// significar alguma coisa
export const BADGE_MIN_DROP_PERCENT = 5
export const BADGE_MIN_HISTORY_DAYS = 14
// Se o preço atual já era praticado em mais que essa fração dos dias da janela,
// não é queda: é o preço de sempre
export const USUAL_PRICE_MAX_SHARE = 0.2
// Selo "verificada" (campanhas, vídeo, Telegram)
export const VERIFIED_MIN_DROP_PERCENT = 10
// Acima disso quase sempre é erro de preço na loja
export const MAX_PLAUSIBLE_DROP_PERCENT = 80
// Pico "artificial": algum dia da janela com preço ≥ 30% acima do habitual
export const SPIKE_FACTOR = 1.3
// Sem nenhuma subida de preço nesses últimos dias ("sobe e desce")
export const NO_UPWARD_MOVE_DAYS = 30

// Histórico mínimo do selo "verificada": 45 dias enquanto o monitoramento é
// jovem; 90 dias (3 meses) a partir de 15/11/2026, a semana antes da Black
// Friday. Quando o histórico tiver 6+ meses, subir pra 180.
export function verifiedMinHistoryDays(todayIso: string): number {
  return todayIso >= '2026-11-15' ? 90 : 45
}

const DAY_MS = 86_400_000
const dayNumber = (iso: string) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / DAY_MS)

export interface DropAssessment {
  // Dias desde o primeiro preço monitorado
  historyDays: number
  // Preço habitual (mediana diária da janela) — o "De:" honesto
  reference: number | null
  // Queda contra o habitual, 1 casa decimal; null = não é queda válida
  dropPercent: number | null
  // Passa em TODAS as regras rígidas (campanhas/vídeo/Telegram)
  verified: boolean
  // Há quantos dias monitorados o preço atual é o menor de todos; null = não é
  lowestPriceDays: number | null
  // Diagnóstico (testes e logs)
  usualShare: number | null
  hadSpike: boolean
  upwardMoves: number
}

const EMPTY: DropAssessment = {
  historyDays: 0,
  reference: null,
  dropPercent: null,
  verified: false,
  lowestPriceDays: null,
  usualShare: null,
  hadSpike: false,
  upwardMoves: 0,
}

// `series` = pontos de mudança de preço em ordem de data (o preço vale até o
// próximo ponto); `currentPrice` = preço de hoje; `todayIso` = AAAA-MM-DD.
export function assessPriceDrop(
  series: PricePoint[],
  currentPrice: number,
  todayIso: string,
  // Sobrescreve o histórico mínimo do selo "verificada" (ex.: afrouxar pra 30
  // dias sem mexer no código: variável VERIFIED_MIN_HISTORY_DAYS no build)
  minHistoryDays: number = verifiedMinHistoryDays(todayIso)
): DropAssessment {
  if (series.length === 0) return EMPTY
  const today = dayNumber(todayIso)
  const first = dayNumber(series[0].date)
  const historyDays = today - first
  if (historyDays <= 0) return { ...EMPTY, historyDays: Math.max(historyDays, 0) }

  // Preço de cada dia, de `first` até ontem (carry-forward dos pontos)
  const daily: number[] = []
  let pointer = 0
  let price: number | null = null
  for (let day = first; day <= today - 1; day++) {
    while (pointer < series.length && dayNumber(series[pointer].date) <= day) {
      price = series[pointer].price
      pointer++
    }
    if (price != null) daily.push(price)
  }

  // Precisa ter sido MAIS BARATO hoje que há RECENT_DROP_DAYS dias
  const dayAgoIndex = daily.length - RECENT_DROP_DAYS // posição de "há 7 dias" dentro de daily
  const weekAgoPrice = dayAgoIndex >= 0 ? daily[dayAgoIndex] : null
  const base = { ...EMPTY, historyDays }
  if (weekAgoPrice == null || !(currentPrice < weekAgoPrice)) return base

  // O preço habitual e o "já era esse preço?" olham o período ANTERIOR à última
  // semana (a semana da queda não pode contar como o "habitual"); o pico
  // artificial olha a janela inteira, inclusive essa última semana.
  const before = daily.slice(0, daily.length - RECENT_DROP_DAYS).slice(-REFERENCE_WINDOW_DAYS)
  if (before.length === 0) return base
  const sorted = [...before].sort((a, b) => a - b)
  const reference = sorted[Math.floor((sorted.length - 1) / 2)] // mediana (a inferior, conservadora)
  const usualShare = before.filter((p) => p <= currentPrice * 1.02).length / before.length
  const hadSpike = Math.max(...daily.slice(-REFERENCE_WINDOW_DAYS)) >= reference * SPIKE_FACTOR

  let upwardMoves = 0
  for (let i = 1; i < series.length; i++) {
    if (series[i].price > series[i - 1].price && dayNumber(series[i].date) >= today - NO_UPWARD_MOVE_DAYS) upwardMoves++
  }

  const dropPercent = reference > currentPrice ? Math.round(((reference - currentPrice) / reference) * 1000) / 10 : null
  const valid =
    dropPercent != null &&
    dropPercent >= BADGE_MIN_DROP_PERCENT &&
    historyDays >= BADGE_MIN_HISTORY_DAYS &&
    usualShare < USUAL_PRICE_MAX_SHARE

  // Menor preço de TODO o histórico (não só da janela): é o que "menor preço em N
  // dias" afirma
  const lowestEver = currentPrice <= Math.min(...series.filter((pt) => dayNumber(pt.date) < today).map((pt) => pt.price))
  const verified =
    valid &&
    dropPercent != null &&
    dropPercent >= VERIFIED_MIN_DROP_PERCENT &&
    dropPercent <= MAX_PLAUSIBLE_DROP_PERCENT &&
    historyDays >= minHistoryDays &&
    lowestEver &&
    !hadSpike &&
    upwardMoves === 0

  return {
    historyDays,
    reference,
    dropPercent: valid ? dropPercent : null,
    verified,
    lowestPriceDays: valid && lowestEver ? historyDays : null,
    usualShare,
    hadSpike,
    upwardMoves,
  }
}
