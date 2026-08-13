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

// Teto de pontos por produto (segurança). Como só gravamos quando o preço
// MUDA (não 1 por dia), na prática cada produto tem pouquíssimos pontos — o
// teto só protege contra um produto que mude de preço todo dia por muito tempo.
const MAX_POINTS = 180

// Abaixo disso é ruído de arredondamento/variação de câmbio, não uma queda
// que valha destacar pro usuário.
const MIN_DROP_PERCENT = 5

// Colapsa pontos consecutivos de mesmo preço, mantendo o 1o de cada "corrida"
// (= o dia em que o preço passou a ser aquele). Transforma uma série de
// snapshots diários numa função-degrau enxuta, sem perder quando cada preço
// vigorou. Também compacta o histórico legado (que tinha 1 ponto/dia).
function compactSeries(series) {
  const out = []
  for (const pt of series) {
    if (out.length === 0 || out[out.length - 1].price !== pt.price) out.push(pt)
  }
  return out
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
  let skipped = 0
  const droppedProducts = []
  // Reconstrói o histórico do zero só com os produtos processados agora — assim
  // chaves de produtos que saíram do catálogo (ou perderam a página) são
  // podadas automaticamente, sem crescer o arquivo indefinidamente.
  const nextHistory = {}
  for (const file of productFiles) {
    const product = JSON.parse(await readFile(file, 'utf-8'))
    if (product.searchPrice == null) continue

    const key = `${product.merchantSlug}/${product.slug}`
    const indexEntry = indexByKey.get(key)

    // Só rastreia produto ativo COM página estática (tem foto/dados suficientes).
    // Produto isolado/sem página não vira gráfico e não precisa ocupar histórico.
    if (!indexEntry?.eligibleForStaticPage) {
      skipped++
      continue
    }

    // Compacta o legado (1 ponto/dia) pra função-degrau e grava um ponto novo
    // sempre que o preço MUDA (subida ou queda) — nunca repete o mesmo valor.
    const series = compactSeries(history[key] ?? [])
    // Último preço REGISTRADO antes de hoje = referência pra detectar a queda.
    const prev = series[series.length - 1]
    const previousPrice = prev ? prev.price : null
    if (!prev || prev.price !== product.searchPrice) {
      series.push({ date: today, price: product.searchPrice })
    }
    nextHistory[key] = series.slice(-MAX_POINTS)

    // Pro gráfico, garante um ponto "hoje" (a linha chega até agora) sem gravar
    // isso no histórico — o storage continua só com as mudanças.
    const stored = nextHistory[key]
    product.priceHistory =
      stored[stored.length - 1]?.date === today ? stored : [...stored, { date: today, price: product.searchPrice }]

    // "Caiu de preço" = caiu em relação ao último registro anterior. Só marca no
    // dia da mudança: no dia seguinte o preço estável já é o próprio último
    // registro (atual == anterior), então não conta de novo (não persiste).
    let priceDropPercent = null
    let previousPriceForDrop = null
    if (previousPrice != null && product.searchPrice < previousPrice) {
      const pct = ((previousPrice - product.searchPrice) / previousPrice) * 100
      if (pct >= MIN_DROP_PERCENT) {
        priceDropPercent = Math.round(pct * 10) / 10
        previousPriceForDrop = previousPrice
      }
    }
    product.previousPrice = previousPriceForDrop
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

    if (indexEntry) {
      indexEntry.previousPrice = previousPrice
      indexEntry.priceDropPercent = priceDropPercent
    }

    await writeFile(file, JSON.stringify(product))
    updated++
  }

  await writeFile(HISTORY_PATH, JSON.stringify(nextHistory))
  if (index.length) await writeFile(INDEX_PATH, JSON.stringify(index))
  await writeFile(PRICE_DROPS_PATH, JSON.stringify(droppedProducts))
  console.log(
    `Histórico de preço: ${updated} produtos atualizados, ${skipped} pulados (sem página), ` +
      `${Object.keys(nextHistory).length} chaves no total (antes: ${Object.keys(history).length}), ` +
      `${priceDrops} com preço em queda vs. o anterior.`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
