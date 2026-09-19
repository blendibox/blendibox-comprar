// Roda logo depois do fetch-feeds.mjs (que já gravou o preço atual de cada
// produto). Mantém data/price-history.json (pequeno, versionado no git — o
// workflow faz commit dele de volta toda semana) com um retrato semanal de
// preço por produto, e injeta a fatia relevante em cada arquivo de produto
// pra virar um gráfico simples na página, sem precisar buscar o histórico
// inteiro do site.
import { readFile, writeFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadPriceDrop } from './lib/price-drop.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// PRICE_HISTORY_ROOT redireciona todos os caminhos (só pra testar com dados de mentira)
const ROOT = process.env.PRICE_HISTORY_ROOT ? path.resolve(process.env.PRICE_HISTORY_ROOT) : path.resolve(__dirname, '..')
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
// Mesmo formato do arquivo acima, mas só produtos que caíram de preço HOJE
// de verdade (não a janela de 7 dias) — usado por scripts/generate-daily-video.mjs
// pra evitar repetir o mesmo produto em dias seguidos.
const PRICE_DROPS_TODAY_PATH = path.join(DATA_DIR, 'price-drops-today.json')
// Cópia do arquivo acima em data/ (pequeno, versionado no git — mesmo padrão
// de price-history.json) — public/data/ inteiro é gitignored, então sem essa
// cópia scripts/post-telegram-deals.mjs não teria acesso ao dado do dia numa
// run separada do GitHub Actions mais tarde (só faz checkout, sem rebuscar o
// feed inteiro pra postar num horário melhor que o do cron principal).
const PRICE_DROPS_TODAY_COMMITTED_PATH = path.join(ROOT, 'data', 'price-drops-today.json')

// Teto de pontos por produto (segurança). Como só gravamos quando o preço
// MUDA (não 1 por dia), na prática cada produto tem pouquíssimos pontos — o
// teto só protege contra um produto que mude de preço todo dia por muito tempo.
const MAX_POINTS = 180

// A regra de "queda de preço" mora em src/lib/priceDrop.ts (compilada aqui com
// esbuild): a queda é medida contra o PREÇO HABITUAL (mediana dos últimos até 90
// dias), não contra o preço de 7 dias atrás — que caía na armadilha do "sobe e
// desce" (pico de preço seguido de uma "queda" falsa de 70%). O selo comum
// ("X% essa semana") e o selo "verificada" (campanhas, vídeo, Telegram: histórico
// mínimo, menor preço do período, sem pico nem subida nos últimos 30 dias) saem
// do mesmo cálculo. VERIFIED_MIN_HISTORY_DAYS afrouxa/aperta o histórico mínimo.
const VERIFIED_MIN_HISTORY_OVERRIDE = Number(process.env.VERIFIED_MIN_HISTORY_DAYS) || undefined

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
  const { assessPriceDrop } = await loadPriceDrop()
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
  let verifiedDrops = 0
  let skipped = 0
  const droppedProducts = []
  const droppedTodayProducts = []
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

    // Queda medida contra o preço habitual (ver src/lib/priceDrop.ts). Os campos
    // extras só são gravados quando verdadeiros, pra não engordar os ~145 mil
    // arquivos de produto nem o index.json.
    const assessment = assessPriceDrop(stored, product.searchPrice, today, VERIFIED_MIN_HISTORY_OVERRIDE)
    const priceDropPercent = assessment.dropPercent
    const previousPriceForDrop = priceDropPercent != null ? assessment.reference : null
    product.previousPrice = previousPriceForDrop
    product.priceDropPercent = priceDropPercent
    if (assessment.verified) {
      product.priceDropVerified = true
      product.lowestPriceDays = assessment.lowestPriceDays
      verifiedDrops++
    } else {
      delete product.priceDropVerified
      delete product.lowestPriceDays
    }
    if (priceDropPercent != null) {
      priceDrops++
      droppedProducts.push({
        merchantSlug: product.merchantSlug,
        slug: product.slug,
        productName: product.productName,
        merchantDisplayName: product.merchantDisplayName,
        awImageUrl: product.awImageUrl,
        searchPrice: product.searchPrice,
        previousPrice: previousPriceForDrop,
        priceDropPercent,
        currency: product.currency,
      })
    }

    // Queda "de verdade hoje" (o preço mudou HOJE, não só dentro da janela de 7
    // dias) — pro vídeo diário, o Telegram e o IndexNow, que não devem repetir o
    // mesmo produto em dias seguidos. Só entra quem passa no selo "verificada":
    // sem isso, um pico de preço seguido de uma "queda" viraria post/vídeo. Os
    // valores mostrados (De/percentual) são os do preço habitual.
    if (assessment.verified && previousPrice != null && product.searchPrice < previousPrice) {
      // Só marca "menor preço já registrado" quando é verdade de fato —
      // comparado contra TODO o histórico rastreado (stored), não só a
      // janela recente. Usado pra não inventar esse selo em canais de
      // divulgação (Telegram etc.) quando não é real.
      const isAllTimeLow = product.searchPrice <= Math.min(...stored.map((p) => p.price))
      droppedTodayProducts.push({
        merchantSlug: product.merchantSlug,
        slug: product.slug,
        productName: product.productName,
        merchantDisplayName: product.merchantDisplayName,
        vertical: product.vertical,
        awImageUrl: product.awImageUrl,
        searchPrice: product.searchPrice,
        previousPrice: previousPriceForDrop,
        priceDropPercent,
        currency: product.currency,
        isAllTimeLow,
      })
    }

    if (indexEntry) {
      // Mesmos valores gravados em product.* acima (preço habitual e %).
      indexEntry.previousPrice = previousPriceForDrop
      indexEntry.priceDropPercent = priceDropPercent
      if (assessment.verified) {
        indexEntry.priceDropVerified = true
        indexEntry.lowestPriceDays = assessment.lowestPriceDays
      } else {
        delete indexEntry.priceDropVerified
        delete indexEntry.lowestPriceDays
      }
    }

    await writeFile(file, JSON.stringify(product))
    updated++
  }

  await writeFile(HISTORY_PATH, JSON.stringify(nextHistory))
  if (index.length) await writeFile(INDEX_PATH, JSON.stringify(index))
  await writeFile(PRICE_DROPS_PATH, JSON.stringify(droppedProducts))
  droppedTodayProducts.sort((a, b) => b.priceDropPercent - a.priceDropPercent)
  await writeFile(PRICE_DROPS_TODAY_PATH, JSON.stringify(droppedTodayProducts))
  await writeFile(PRICE_DROPS_TODAY_COMMITTED_PATH, JSON.stringify(droppedTodayProducts))
  console.log(
    `Histórico de preço: ${updated} produtos atualizados, ${skipped} pulados (sem página), ` +
      `${Object.keys(nextHistory).length} chaves no total (antes: ${Object.keys(history).length}), ` +
      `${priceDrops} com queda vs. o preço habitual (${verifiedDrops} verificadas; ${droppedTodayProducts.length} verificadas que caíram hoje).`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
