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

// O painel da Awin exporta em português OU inglês dependendo do idioma
// configurado na conta no momento — já vimos os dois formatos vindo do
// mesmo relatório em datas diferentes (ex: "Aprovado"/"Pendente" com `;`
// como delimitador vs "Approved"/"Pending" com `,`). Sem isso, uma troca de
// idioma na conta faz o script silenciosamente não reconhecer nenhuma linha
// (nem status nem coluna de produtos batem) e gravar um sales-highlights.csv
// vazio, sem erro nenhum avisando o motivo.
const KEEP_STATUS = new Set(['Aprovado', 'Approved', 'Pendente', 'Pending'])
const PRODUCTS_FIELD_ALIASES = ['produtos', 'products']
const DATE_FIELD_ALIASES = ['data', 'date']

function firstDefined(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined) return row[key]
  }
  return undefined
}

// Conta separadores fora de aspas na linha de cabeçalho pra decidir o
// delimitador real do arquivo, em vez de assumir um fixo.
function detectDelimiter(firstLine) {
  let inQuotes = false
  let commas = 0
  let semicolons = 0
  for (const ch of firstLine) {
    if (ch === '"') inQuotes = !inQuotes
    else if (!inQuotes && ch === ',') commas++
    else if (!inQuotes && ch === ';') semicolons++
  }
  return semicolons > commas ? ';' : ','
}

async function main() {
  const inputPath = process.argv[2]
  if (!inputPath) {
    console.error('Uso: node scripts/sanitize-sales-export.mjs "<caminho do CSV exportado da Awin>"')
    process.exit(1)
  }

  const raw = await readFile(inputPath, 'utf-8')
  const delimiter = detectDelimiter(raw.slice(0, raw.indexOf('\n')))
  const rows = parse(raw, { columns: true, delimiter, skip_empty_lines: true, relax_quotes: true, relax_column_count: true })

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
      items = JSON.parse(firstDefined(row, PRODUCTS_FIELD_ALIASES) || '[]')
    } catch {
      items = []
    }

    if (!items.length) {
      skippedNoProducts++
      continue
    }

    const date = String(firstDefined(row, DATE_FIELD_ALIASES) || '').slice(0, 10)
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
