// Ferramenta local (não roda no build/CI): lê o export bruto de transações do
// painel Awin (que tem valor de venda, comissão, país do cliente, IDs de
// pagamento etc. — dado comercial sensível, nunca deve ir pro repo) e gera
// data/sales-highlights.csv, um arquivo pequeno e seguro (só produto, loja,
// categoria e data) usado pra destacar "comprado recentemente" no site.
//
// Uso: node scripts/sanitize-sales-export.mjs "C:\caminho\para\transacoes.csv"
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'csv-parse/sync'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const KEEP_STATUS = new Set(['Aprovado', 'Pendente'])

async function main() {
  const inputPath = process.argv[2]
  if (!inputPath) {
    console.error('Uso: node scripts/sanitize-sales-export.mjs "<caminho do CSV exportado da Awin>"')
    process.exit(1)
  }

  const raw = await readFile(inputPath, 'utf-8')
  const rows = parse(raw, { columns: true, delimiter: ';', skip_empty_lines: true, relax_quotes: true, relax_column_count: true })

  const out = []
  let skippedStatus = 0
  let skippedNoProducts = 0

  for (const row of rows) {
    const status = row['commission_status']
    if (!KEEP_STATUS.has(status)) {
      skippedStatus++
      continue
    }

    let items
    try {
      items = JSON.parse(row['produtos'] || '[]')
    } catch {
      items = []
    }

    if (!items.length) {
      skippedNoProducts++
      continue
    }

    const date = String(row['data'] || '').slice(0, 10)
    const merchant = row['site_name']

    for (const item of items) {
      if (!item.product_name || item.product_name === 'undefined' || !item.sku_code) continue
      out.push({
        merchant,
        product_name: item.product_name,
        sku_code: item.sku_code,
        category: item.category || '',
        date,
        status,
      })
    }
  }

  const columns = ['merchant', 'product_name', 'sku_code', 'category', 'date', 'status']
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const lines = [columns.join(';')]
  for (const item of out) {
    lines.push(columns.map((c) => escape(item[c])).join(';'))
  }
  const csv = lines.join('\n') + '\n'

  const outPath = path.join(ROOT, 'data', 'sales-highlights.csv')
  await writeFile(outPath, csv)
  console.log(
    `sales-highlights.csv: ${out.length} itens gravados (${rows.length} transações lidas, ${skippedStatus} ignoradas por status, ${skippedNoProducts} sem produto).`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
