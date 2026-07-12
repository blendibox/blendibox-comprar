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
const HISTORY_PATH = path.join(ROOT, 'data', 'price-history.json')

// Quantas semanas de histórico guardar por produto — o suficiente pra um
// gráfico útil (~3 meses) sem deixar o arquivo crescer indefinidamente.
const MAX_POINTS = 12

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

  const today = new Date().toISOString().slice(0, 10)
  const productFiles = await walkProductFiles(path.join(DATA_DIR, 'products'))

  let updated = 0
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
    await writeFile(file, JSON.stringify(product))
    updated++
  }

  await writeFile(HISTORY_PATH, JSON.stringify(history))
  console.log(`Histórico de preço: ${updated} produtos atualizados, ${Object.keys(history).length} chaves no total.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
