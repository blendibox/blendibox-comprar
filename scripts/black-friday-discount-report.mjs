// Ferramenta de PAUTA, não faz parte do build automático. Roda sob demanda
// perto da Black Friday pra medir, com dado real (o histórico de preço que o
// site já grava todo dia — data/price-history.json), quantos produtos
// "em oferta" na janela da BF realmente bateram (ou empataram) a menor
// cotação real dos últimos meses, e quantos não bateram — sem inventar nada,
// é comparação direta contra os pontos gravados.
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const HISTORY_PATH = path.join(ROOT, 'data', 'price-history.json')

const DAY_MS = 24 * 60 * 60 * 1000

// --- Ajuste antes de rodar de verdade ---
// Janela de "oferta": cobre a Black Friday e o Cyber Monday que costuma vir
// junto. BF 2026 confirmada = 27/11 (sexta após a Ação de Graças dos EUA).
const BF_WINDOW_START = '2026-11-27'
const BF_WINDOW_END = '2026-11-30'
// Quantos dias ANTES da janela olhamos pra achar o "preço mais baixo real".
const REFERENCE_DAYS = 90
// Produto precisa ter histórico gravado desde pelo menos essa quantidade de
// dias antes da janela pra entrar na amostra — evita contar produto novo
// (sem dado suficiente) como "sem desconto real" por falta de referência.
const MIN_COVERAGE_DAYS = 60
const TOP_EXAMPLES = 15

const dateMs = (iso) => new Date(`${iso}T00:00:00Z`).getTime()
const isoOf = (ms) => new Date(ms).toISOString().slice(0, 10)
const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : 0)

// Preço vigente numa data X = carry-forward do último ponto <= X (a série só
// grava mudança, então o preço fica valendo até o próximo ponto).
function priceAt(series, iso) {
  const ms = dateMs(iso)
  let price = null
  for (const pt of series) {
    if (dateMs(pt.date) > ms) break
    price = pt.price
  }
  return price
}

// Mínimo real no intervalo [startIso, endIsoExclusive). Como é função-degrau,
// o mínimo do intervalo contínuo é sempre o mínimo entre o preço vigente ao
// ENTRAR na janela e o preço de cada mudança que ocorre dentro dela.
function minInRange(series, startIso, endIsoExclusive) {
  const startMs = dateMs(startIso)
  const endMs = dateMs(endIsoExclusive)
  let entryPrice = null
  const candidates = []
  for (const pt of series) {
    const ms = dateMs(pt.date)
    if (ms < startMs) {
      entryPrice = pt.price
      continue
    }
    if (ms >= endMs) break
    candidates.push(pt.price)
  }
  if (entryPrice != null) candidates.push(entryPrice)
  return candidates.length ? Math.min(...candidates) : null
}

export function analyze(history, opts = {}) {
  const windowStart = opts.windowStart ?? BF_WINDOW_START
  const windowEnd = opts.windowEnd ?? BF_WINDOW_END
  const referenceDays = opts.referenceDays ?? REFERENCE_DAYS
  const minCoverageDays = opts.minCoverageDays ?? MIN_COVERAGE_DAYS

  const refStart = isoOf(dateMs(windowStart) - referenceDays * DAY_MS)
  const coverageThreshold = dateMs(windowStart) - minCoverageDays * DAY_MS

  let total = 0
  let insufficientHistory = 0
  let onSale = 0
  let realLow = 0
  let notRealLow = 0
  const examples = []

  for (const [key, rawSeries] of Object.entries(history)) {
    if (!rawSeries || rawSeries.length === 0) continue
    total++
    const series = [...rawSeries].sort((a, b) => dateMs(a.date) - dateMs(b.date))

    if (dateMs(series[0].date) > coverageThreshold) {
      insufficientHistory++
      continue
    }

    const priceBeforeWindow = priceAt(series, isoOf(dateMs(windowStart) - DAY_MS))
    const bfPrice = priceAt(series, windowEnd)
    if (priceBeforeWindow == null || bfPrice == null) continue
    if (!(bfPrice < priceBeforeWindow)) continue // não teve queda anunciada na janela

    onSale++
    const refMin = minInRange(series, refStart, windowStart)
    if (refMin == null) {
      insufficientHistory++
      continue
    }

    if (bfPrice <= refMin) {
      realLow++
    } else {
      notRealLow++
      examples.push({
        key,
        bfPrice,
        priceBeforeWindow,
        refMin,
        diffPercent: Math.round(((bfPrice - refMin) / refMin) * 1000) / 10,
      })
    }
  }

  examples.sort((a, b) => b.diffPercent - a.diffPercent)

  return {
    total,
    insufficientHistory,
    onSale,
    realLow,
    notRealLow,
    realLowPercent: pct(realLow, onSale),
    notRealLowPercent: pct(notRealLow, onSale),
    examples: examples.slice(0, TOP_EXAMPLES),
  }
}

async function main() {
  const history = JSON.parse(await readFile(HISTORY_PATH, 'utf-8'))
  const r = analyze(history)

  console.log(`Janela de oferta analisada: ${BF_WINDOW_START} a ${BF_WINDOW_END}`)
  console.log(`Referência: mínima real dos ${REFERENCE_DAYS} dias anteriores (até ${MIN_COVERAGE_DAYS}d de cobertura mínima)\n`)
  console.log(`Produtos no histórico: ${r.total}`)
  console.log(`Descartados por histórico insuficiente: ${r.insufficientHistory}`)
  console.log(`Com queda de preço anunciada na janela: ${r.onSale}`)
  console.log(`  → bateram/empataram a mínima real dos ${REFERENCE_DAYS}d anteriores: ${r.realLow} (${r.realLowPercent}%)`)
  console.log(`  → ficaram ACIMA da mínima real dos ${REFERENCE_DAYS}d anteriores: ${r.notRealLow} (${r.notRealLowPercent}%)`)

  if (r.examples.length) {
    console.log(`\nExemplos (maior diferença vs. mínima real, uso interno — avaliar antes de citar loja/produto publicamente):`)
    for (const e of r.examples) {
      console.log(
        `  ${e.key}: oferta R$${e.bfPrice} vs. mínima real R$${e.refMin} (+${e.diffPercent}%) · preço véspera R$${e.priceBeforeWindow}`
      )
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
