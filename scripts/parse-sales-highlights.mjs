// Gera public/data/social-proof.json ("comprado recentemente" na home).
//
// Fonte das vendas, em ordem de preferência:
//   1. API de Transações da Awin (AWIN_PROMOTIONS_TOKEN — o mesmo dos cupons),
//      com showBasketProducts=true pra trazer os produtos de cada compra.
//      Automático, sem export manual.
//   2. Fallback: data/sales-highlights.csv (export manual sanitizado — ver
//      scripts/sanitize-sales-export.mjs), pra dev local sem token.
//
// O match com o produto real do catálogo é resolvido AQUI (build time, contra
// public/data/index.json que o fetch-feeds.mjs acabou de gerar). Pra alguns
// lojistas (ex: Vivara) o "sku" da transação não bate com o merchant_product_id
// do feed (é a variante vendida), então cai num fallback que casa pelo nome do
// produto (slugificado) dentro do mesmo merchant.
//
// Inclui compras "pending" (é venda real que aconteceu, só não validada ainda)
// — é social proof. Exclui só "declined"/"deleted" (canceladas/estornadas):
// mostrar essas como "comprado" seria falso.
import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'csv-parse/sync'
import { slugify } from './lib/slugify.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUTPUT_DIR = path.join(ROOT, 'public', 'data')

const MAX_ENTRIES = 24
const LOOKBACK_DAYS = 30 // limite da API de transações da Awin é 31 dias; 30 dá folga
const PUBLISHER_ID = process.env.AWIN_PUBLISHER_ID || '2104315'
const TOKEN = process.env.AWIN_PROMOTIONS_TOKEN
const EXCLUDED_STATUS = new Set(['declined', 'deleted'])

async function fileExists(p) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

// Não expõe data exata (é dado de venda real) — só um rótulo relativo grosseiro,
// calculado no momento do build.
function relativeLabel(dateStr, now) {
  const date = new Date(`${dateStr}T00:00:00`)
  const days = Math.floor((now - date) / (1000 * 60 * 60 * 24))
  if (days <= 7) return 'essa semana'
  if (days <= 14) return 'há 2 semanas'
  if (days <= 31) return 'esse mês'
  if (days <= 62) return 'há 2 meses'
  return 'há alguns meses'
}

// Tenta achar o produto real correspondente à linha da venda, dentro do mesmo
// merchant: primeiro pelo SKU (sufixo do slug), depois pelo nome do produto
// (prefixo do slug). Retorna null se não achar.
function resolveProduct(candidates, skuSlug, productName) {
  if (skuSlug) {
    const bySku = candidates.find((p) => p.slug.endsWith(`-${skuSlug}`) || p.slug === skuSlug)
    if (bySku) return bySku
  }
  const nameSlug = slugify(productName)
  if (!nameSlug) return null
  return candidates.find((p) => p.slug === nameSlug || p.slug.startsWith(`${nameSlug}-`)) ?? null
}

// Normaliza a data (aceita ISO "2026-08-12T11:44:00" ou "2026-08-12") -> YYYY-MM-DD.
function toYmd(value) {
  const m = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? m[0] : ''
}

// Busca transações na API da Awin e devolve linhas normalizadas
// { merchant, productName, skuCode, date }. Cada produto do basket vira 1 linha.
async function fetchRowsFromApi(merchantsById) {
  const end = new Date()
  const start = new Date(end.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
  const fmt = (d) => d.toISOString().slice(0, 19) // YYYY-MM-DDTHH:mm:ss
  const url =
    `https://api.awin.com/publishers/${PUBLISHER_ID}/transactions/` +
    `?startDate=${fmt(start)}&endDate=${fmt(end)}&timezone=UTC&dateType=transaction&showBasketProducts=true`

  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Awin transactions API: HTTP ${res.status}`)
  const body = await res.json()
  // A API costuma devolver um array puro; alguns endpoints embrulham em {data}.
  const txns = Array.isArray(body) ? body : body?.data ?? body?.transactions ?? []
  if (!Array.isArray(txns)) throw new Error('Awin transactions API: formato de resposta inesperado')

  // Amostra pra depurar o formato real (nomes de campos variam por conta/versão).
  if (txns[0]) {
    console.log('[vendas] chaves da 1a transação:', Object.keys(txns[0]).join(', '))
    const sampleProducts = txns[0].basketProducts ?? txns[0].products ?? []
    if (sampleProducts[0]) console.log('[vendas] chaves do 1o produto:', Object.keys(sampleProducts[0]).join(', '))
  }

  const rows = []
  let declined = 0
  let noProducts = 0
  for (const t of txns) {
    const status = String(t.commissionStatus ?? t.status ?? '').toLowerCase()
    if (EXCLUDED_STATUS.has(status)) {
      declined++
      continue
    }
    const merchant = merchantsById[String(t.advertiserId ?? t.advertiser?.id ?? '')]
    if (!merchant?.active) continue

    const date = toYmd(t.transactionDate ?? t.transactionDateTime)
    const products = t.basketProducts ?? t.products ?? []
    if (!products.length) {
      noProducts++
      continue
    }
    for (const p of products) {
      const productName = p.productName ?? p.name ?? ''
      const skuCode = p.productId ?? p.skuCode ?? p.sku ?? ''
      if (!productName && !skuCode) continue
      rows.push({ merchant, productName, skuCode: String(skuCode), date })
    }
  }

  console.log(
    `[vendas] API: ${txns.length} transações, ${declined} declined/deleted ignoradas, ` +
      `${noProducts} sem produtos no basket, ${rows.length} linha(s) de produto.`
  )
  return rows
}

// Lê o CSV manual (fallback) e devolve linhas normalizadas.
function rowsFromCsv(csvText, byDisplayName) {
  const parsed = parse(csvText, {
    columns: true,
    delimiter: ';',
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  })
  return parsed.map((r) => ({
    merchant: byDisplayName.get(r['merchant']),
    productName: r['product_name'],
    skuCode: r['sku_code'],
    date: toYmd(r['date']) || r['date'],
  }))
}

async function main() {
  const indexPath = path.join(OUTPUT_DIR, 'index.json')
  if (!(await fileExists(indexPath))) {
    throw new Error('public/data/index.json não existe — parse-sales-highlights.mjs precisa rodar depois do fetch-feeds.mjs.')
  }
  const outputPath = path.join(OUTPUT_DIR, 'social-proof.json')

  const merchantsConfig = JSON.parse(await readFile(path.join(__dirname, 'merchants.config.json'), 'utf-8'))
  const merchantsById = merchantsConfig.merchants
  const byDisplayName = new Map()
  for (const m of Object.values(merchantsById)) byDisplayName.set(m.displayName, m)

  const index = JSON.parse(await readFile(indexPath, 'utf-8'))
  const byMerchant = new Map()
  for (const p of index) {
    const list = byMerchant.get(p.merchantSlug)
    if (list) list.push(p)
    else byMerchant.set(p.merchantSlug, [p])
  }

  // 1) API (preferida). 2) CSV (fallback dev). Falha da API não quebra o build.
  let rows = null
  if (TOKEN) {
    try {
      rows = await fetchRowsFromApi(merchantsById)
    } catch (err) {
      console.error(`[vendas] API falhou (${err.message}) — tentando CSV/fallback.`)
      rows = null
    }
  }
  if (rows == null) {
    const csvPath = path.join(ROOT, 'data', 'sales-highlights.csv')
    if (await fileExists(csvPath)) {
      rows = rowsFromCsv(await readFile(csvPath, 'utf-8'), byDisplayName)
    } else {
      rows = []
    }
  }

  const now = new Date()
  const byKey = new Map()
  let unmatched = 0

  for (const row of rows) {
    const merchant = row.merchant
    if (!merchant?.active) continue
    const candidates = byMerchant.get(merchant.slug) ?? []
    const product = resolveProduct(candidates, slugify(row.skuCode), row.productName)
    if (!product) {
      unmatched++
      continue
    }
    const key = `${merchant.slug}:${product.slug}`
    const existing = byKey.get(key)
    if (existing && existing.date >= row.date) continue
    byKey.set(key, { merchantSlug: merchant.slug, productName: product.productName, slug: product.slug, date: row.date })
  }

  const entries = [...byKey.values()]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, MAX_ENTRIES)
    .map(({ merchantSlug, productName, slug, date }) => ({
      merchantSlug,
      productName,
      slug,
      label: relativeLabel(date, now),
    }))

  await mkdir(OUTPUT_DIR, { recursive: true })

  // Salvaguarda: se não conseguimos nenhum destaque agora mas já existe um
  // social-proof.json (curado/anterior), não esvazia a seção — mantém o que há.
  if (entries.length === 0 && (await fileExists(outputPath))) {
    console.log('Destaques de vendas: 0 novos — mantendo social-proof.json atual pra não esvaziar a seção.')
    return
  }

  await writeFile(outputPath, JSON.stringify(entries))
  console.log(
    `Destaques de vendas: ${entries.length} produtos gravados (${rows.length} linha(s) de venda, ${unmatched} sem produto no catálogo atual).`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
