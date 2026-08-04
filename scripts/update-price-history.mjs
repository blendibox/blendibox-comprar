// Roda logo depois do fetch-feeds.mjs (que já gravou o preço atual de cada
// produto). Mantém data/price-history.json (pequeno, versionado no git — o
// workflow faz commit dele de volta toda semana) com um retrato semanal de
// preço por produto, e injeta a fatia relevante em cada arquivo de produto
// pra virar um gráfico simples na página, sem precisar buscar o histórico
// inteiro do site.
import { readFile, writeFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'public', 'data')
const INDEX_PATH = path.join(DATA_DIR, 'index.json')
const HISTORY_PATH = path.join(ROOT, 'data', 'price-history.json')
// Lista enxuta de todo produto com queda de preço confirmada nesta rodada —
// pequena o suficiente pro Worker de e-mail (ver worker/newsletter-worker.js)
// buscar direto, sem precisar do index.json inteiro (dezenas de MB).
const PRICE_DROPS_PATH = path.join(DATA_DIR, 'price-drops.json')

// Quantos pontos de histórico guardar por produto. O build roda todo dia
// (deploy.yml, cron diário) e grava ~1 ponto por dia, então 180 pontos cobre
// os 6 meses oferecidos no seletor de período do gráfico (PriceHistoryChart)
// sem deixar o arquivo crescer indefinidamente. Como o histórico só começa a
// contar a partir de quando cada limite entrou em vigor, os períodos mais
// longos (3/6 meses) só mostram mais do que "30 dias" depois que dias reais
// suficientes tiverem passado — nunca preenchemos com dado inventado.
const MAX_POINTS = 180

// Janela de tolerância pra achar o ponto "de uma semana atrás": o cron roda
// todo dia, então normalmente existe um ponto a exatos 7 dias, mas aceita de
// 6 a 10 dias pra não perder o destaque só porque um dia de build falhou ou
// atrasou. Dentro da janela, pega o ponto mais próximo de 7 dias.
const MIN_LOOKBACK_DAYS = 6
const MAX_LOOKBACK_DAYS = 10
const DAY_MS = 24 * 60 * 60 * 1000

// Abaixo disso é ruído de arredondamento/variação de câmbio, não uma queda
// que valha destacar pro usuário.
const MIN_DROP_PERCENT = 5

function findWeekAgoPrice(series, todayMs) {
  let best = null
  let bestDiff = Infinity
  for (const point of series) {
    const ageDays = (todayMs - new Date(point.date).getTime()) / DAY_MS
    if (ageDays < MIN_LOOKBACK_DAYS || ageDays > MAX_LOOKBACK_DAYS) continue
    const diff = Math.abs(ageDays - 7)
    if (diff < bestDiff) {
      bestDiff = diff
      best = point
    }
  }
  return best
}

// Retorna { previousPrice, priceDropPercent }, ambos null quando não há dado
// de referência de ~1 semana atrás ou o preço não caiu o suficiente.
function computePriceDrop(series, currentPrice, todayMs) {
  const weekAgo = findWeekAgoPrice(series, todayMs)
  if (!weekAgo || weekAgo.price <= currentPrice) return { previousPrice: null, priceDropPercent: null }
  const pct = ((weekAgo.price - currentPrice) / weekAgo.price) * 100
  if (pct < MIN_DROP_PERCENT) return { previousPrice: null, priceDropPercent: null }
  return { previousPrice: weekAgo.price, priceDropPercent: Math.round(pct * 10) / 10 }
}

async function walkProductFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await walkProductFiles(full)))
    else if (entry.name.endsWith('.json')) files.push(full)
  }
  return files
}

async function main() {
  let history = {}
  try {
    history = JSON.parse(await readFile(HISTORY_PATH, 'utf-8'))
  } catch {
    // Primeira execução — sem histórico anterior, começa do zero.
  }

  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const todayMs = now.getTime()
  const productFiles = await walkProductFiles(path.join(DATA_DIR, 'products'))

  // index.json é gerado pelo fetch-feeds.mjs (que roda antes deste script) —
  // pra a home poder destacar quem baixou de preço sem precisar buscar o
  // JSON de cada produto individualmente, o resultado calculado aqui também
  // precisa ser refletido nessas entradas leves, não só no detalhe completo.
  let index = []
  try {
    index = JSON.parse(await readFile(INDEX_PATH, 'utf-8'))
  } catch {
    // Sem index.json ainda (ex: primeiro fetch-feed local) — segue sem patch.
  }
  const indexByKey = new Map(index.map((entry) => [`${entry.merchantSlug}/${entry.slug}`, entry]))

  let updated = 0
  let priceDrops = 0
  const droppedProducts = []
  for (const file of productFiles) {
    const product = JSON.parse(await readFile(file, 'utf-8'))
    if (product.searchPrice == null) continue

    const key = `${product.merchantSlug}/${product.slug}`
    const series = history[key] ?? []
    const last = series[series.length - 1]

    // Só grava um ponto novo se o preço mudou ou já faz uma semana desde o
    // último registro — evita reescrever a mesma linha reta toda semana.
    if (!last || last.price !== product.searchPrice || last.date !== today) {
      series.push({ date: today, price: product.searchPrice })
    }
    history[key] = series.slice(-MAX_POINTS)

    product.priceHistory = history[key]
    const { previousPrice, priceDropPercent } = computePriceDrop(history[key], product.searchPrice, todayMs)
    product.previousPrice = previousPrice
    product.priceDropPercent = priceDropPercent
    if (priceDropPercent != null) {
      priceDrops++
      droppedProducts.push({
        merchantSlug: product.merchantSlug,
        slug: product.slug,
        productName: product.productName,
        merchantDisplayName: product.merchantDisplayName,
        awImageUrl: product.awImageUrl,
        searchPrice: product.searchPrice,
        previousPrice,
        priceDropPercent,
        currency: product.currency,
      })
    }

    const indexEntry = indexByKey.get(key)
    if (indexEntry) {
      indexEntry.previousPrice = previousPrice
      indexEntry.priceDropPercent = priceDropPercent
    }

    await writeFile(file, JSON.stringify(product))
    updated++
  }

  await writeFile(HISTORY_PATH, JSON.stringify(history))
  if (index.length) await writeFile(INDEX_PATH, JSON.stringify(index))
  await writeFile(PRICE_DROPS_PATH, JSON.stringify(droppedProducts))
  console.log(
    `Histórico de preço: ${updated} produtos atualizados, ${Object.keys(history).length} chaves no total, ${priceDrops} com queda de preço na última semana.`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
