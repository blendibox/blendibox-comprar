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
// meta.json é gravado pelo fetch-feeds.mjs a cada rodada com generatedAt — usamos
// como marcador de frescor: só gravamos preço de "hoje" se o feed foi buscado hoje.
const META_PATH = path.join(DATA_DIR, 'meta.json')
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

// De-duplica por DATA mantendo o ÚLTIMO ponto de cada dia (= o preço mais
// recente observado naquele dia). O eixo do gráfico é por dia, então dois
// pontos na mesma data viram uma barra vertical (bug visual) e ainda enganam a
// legenda. Isso acontecia quando o pipeline rodava mais de uma vez no mesmo dia
// (ou por um registro mal-datado): o valor real de cada dia distinto é
// preservado — só a duplicata do mesmo dia some.
function dedupeByDate(series) {
  const byDate = new Map()
  for (const pt of series) byDate.set(pt.date, pt)
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
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

  // Trava de frescor: só grava preço de "hoje" se o feed foi buscado HOJE. O
  // fetch-feeds.mjs (que roda logo antes no build) grava meta.json com
  // generatedAt. Se este script rodar isolado, com public/data/ defasado (o
  // que causou o carimbo de um preço velho na data de hoje), abortamos sem
  // escrever nada — histórico intacto. No CI é transparente: o feed é sempre
  // do dia.
  let feedDate = null
  try {
    const meta = JSON.parse(await readFile(META_PATH, 'utf-8'))
    feedDate = typeof meta.generatedAt === 'string' ? meta.generatedAt.slice(0, 10) : null
  } catch {
    // sem meta.json — trata como não-fresco
  }
  if (feedDate !== today) {
    console.warn(
      `update-price-history: feed não é de hoje (meta.generatedAt=${feedDate ?? 'ausente'}, hoje=${today}). ` +
        'Abortando sem gravar — rode "npm run fetch-feed" antes. Histórico preservado.'
    )
    return
  }

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

    // De-duplica por data (mantém o último de cada dia) e compacta o legado
    // (1 ponto/dia) pra função-degrau. Remove qualquer ponto já gravado HOJE
    // por uma rodada anterior do mesmo dia — o preço de hoje é sempre o
    // searchPrice atual, nunca um registro empilhado (evita a barra vertical no
    // gráfico e a legenda enganada).
    const series = compactSeries(dedupeByDate(history[key] ?? []))
    while (series.length && series[series.length - 1].date === today) series.pop()
    // Último preço REGISTRADO num dia ANTERIOR a hoje = referência pra queda.
    const prev = series[series.length - 1]
    const previousPrice = prev ? prev.price : null
    // Grava um ponto novo só quando o preço MUDA (subida ou queda) — nunca
    // repete o mesmo valor do dia anterior.
    if (previousPrice == null || previousPrice !== product.searchPrice) {
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
