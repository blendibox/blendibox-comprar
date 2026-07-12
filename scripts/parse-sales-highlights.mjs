// Lê data/sales-highlights.csv (versão já sanitizada de um export de
// transações da Awin, sem valor de venda/comissão/dados de cliente — ver
// scripts/sanitize-sales-export.mjs) e gera public/data/social-proof.json,
// usado pra destacar "comprado recentemente" na home. O match com o produto
// real do catálogo é feito no cliente (ListingPage), comparando o sufixo do
// slug com o sku_code slugificado — não precisa de índice extra aqui.
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

async function main() {
  const csvPath = path.join(ROOT, 'data', 'sales-highlights.csv')
  if (!(await fileExists(csvPath))) {
    console.log('data/sales-highlights.csv não existe — build segue sem destaques de vendas.')
    await mkdir(OUTPUT_DIR, { recursive: true })
    await writeFile(path.join(OUTPUT_DIR, 'social-proof.json'), '[]')
    return
  }

  const merchantsConfig = JSON.parse(await readFile(path.join(__dirname, 'merchants.config.json'), 'utf-8'))
  const byDisplayName = new Map()
  for (const m of Object.values(merchantsConfig.merchants)) {
    byDisplayName.set(m.displayName, m)
  }

  const raw = await readFile(csvPath, 'utf-8')
  const rows = parse(raw, { columns: true, delimiter: ';', skip_empty_lines: true, relax_quotes: true, relax_column_count: true })

  const now = new Date()
  const byKey = new Map()

  for (const row of rows) {
    const merchant = byDisplayName.get(row['merchant'])
    if (!merchant?.active) continue

    const skuSlug = slugify(row['sku_code'])
    if (!skuSlug) continue

    const key = `${merchant.slug}:${skuSlug}`
    const date = row['date']
    const existing = byKey.get(key)
    if (existing && existing.date >= date) continue

    byKey.set(key, {
      merchantSlug: merchant.slug,
      productName: row['product_name'],
      skuSlug,
      date,
    })
  }

  const entries = [...byKey.values()]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, MAX_ENTRIES)
    .map(({ merchantSlug, productName, skuSlug, date }) => ({
      merchantSlug,
      productName,
      skuSlug,
      label: relativeLabel(date, now),
    }))

  await mkdir(OUTPUT_DIR, { recursive: true })
  await writeFile(path.join(OUTPUT_DIR, 'social-proof.json'), JSON.stringify(entries))
  console.log(`Destaques de vendas: ${entries.length} produtos gravados (${rows.length} linhas lidas).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
