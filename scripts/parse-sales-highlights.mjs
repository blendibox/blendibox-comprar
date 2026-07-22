// Lê data/sales-highlights.csv (versão já sanitizada de um export de
// transações da Awin, sem valor de venda/comissão/dados de cliente — ver
// scripts/sanitize-sales-export.mjs) e gera public/data/social-proof.json,
// usado pra destacar "comprado recentemente" na home.
//
// O match com o produto real do catálogo é resolvido AQUI (build time,
// contra o public/data/index.json que o fetch-feeds.mjs acabou de gerar),
// não mais adivinhado no cliente. Motivo: pra alguns lojistas (ex: Vivara),
// o "sku_code" do export de transações não bate com o merchant_product_id
// usado no feed de produtos — parece ser o código de uma variante
// específica (tamanho/cor) vendida, enquanto o feed só lista uma variante
// "representante" por nome de produto. Nesses casos, cai num fallback que
// casa pelo nome do produto (slugificado) dentro do mesmo merchant.
import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'csv-parse/sync'
import { slugify } from './lib/slugify.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUTPUT_DIR = path.join(ROOT, 'public', 'data')

const MAX_ENTRIES = 24

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

// Tenta achar o produto real correspondente à linha da venda, dentro do
// mesmo merchant: primeiro pelo SKU (sufixo do slug, caso mais comum),
// depois pelo nome do produto (prefixo do slug, cobre o caso de SKU de
// variante que não aparece no feed). Retorna null se não achar nenhum.
function resolveProduct(candidates, skuSlug, productName) {
  if (skuSlug) {
    const bySku = candidates.find((p) => p.slug.endsWith(`-${skuSlug}`) || p.slug === skuSlug)
    if (bySku) return bySku
  }
  const nameSlug = slugify(productName)
  if (!nameSlug) return null
  return candidates.find((p) => p.slug === nameSlug || p.slug.startsWith(`${nameSlug}-`)) ?? null
}

async function main() {
  const csvPath = path.join(ROOT, 'data', 'sales-highlights.csv')
  if (!(await fileExists(csvPath))) {
    console.log('data/sales-highlights.csv não existe — build segue sem destaques de vendas.')
    await mkdir(OUTPUT_DIR, { recursive: true })
    await writeFile(path.join(OUTPUT_DIR, 'social-proof.json'), '[]')
    return
  }

  const indexPath = path.join(OUTPUT_DIR, 'index.json')
  if (!(await fileExists(indexPath))) {
    throw new Error('public/data/index.json não existe — parse-sales-highlights.mjs precisa rodar depois do fetch-feeds.mjs.')
  }

  const merchantsConfig = JSON.parse(await readFile(path.join(__dirname, 'merchants.config.json'), 'utf-8'))
  const byDisplayName = new Map()
  for (const m of Object.values(merchantsConfig.merchants)) {
    byDisplayName.set(m.displayName, m)
  }

  const index = JSON.parse(await readFile(indexPath, 'utf-8'))
  const byMerchant = new Map()
  for (const p of index) {
    const list = byMerchant.get(p.merchantSlug)
    if (list) list.push(p)
    else byMerchant.set(p.merchantSlug, [p])
  }

  const raw = await readFile(csvPath, 'utf-8')
  const rows = parse(raw, { columns: true, delimiter: ';', skip_empty_lines: true, relax_quotes: true, relax_column_count: true })

  const now = new Date()
  const byKey = new Map()
  let unmatched = 0

  for (const row of rows) {
    const merchant = byDisplayName.get(row['merchant'])
    if (!merchant?.active) continue

    const candidates = byMerchant.get(merchant.slug) ?? []
    const skuSlug = slugify(row['sku_code'])
    const product = resolveProduct(candidates, skuSlug, row['product_name'])
    if (!product) {
      unmatched++
      continue
    }

    const key = `${merchant.slug}:${product.slug}`
    const date = row['date']
    const existing = byKey.get(key)
    if (existing && existing.date >= date) continue

    byKey.set(key, {
      merchantSlug: merchant.slug,
      productName: product.productName,
      slug: product.slug,
      date,
    })
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
  await writeFile(path.join(OUTPUT_DIR, 'social-proof.json'), JSON.stringify(entries))
  console.log(
    `Destaques de vendas: ${entries.length} produtos gravados (${rows.length} linhas lidas, ${unmatched} sem produto correspondente no catálogo atual).`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
