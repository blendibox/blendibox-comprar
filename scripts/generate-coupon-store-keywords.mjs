// Gera public/data/coupon-store-keywords.json: pra cada loja QUE TEM CUPOM, as
// palavras que aparecem nos nomes dos produtos dela no catálogo e em quantos
// produtos. A central de cupons usa isso pra mostrar "cupons de lojas que vendem
// cafeteira" — sem baixar o index.json (dezenas de MB) no celular, e sem chutar
// por categoria. Rodar depois de fetch-feeds e fetch-coupons.
//
// Nunca derruba o build: sem este arquivo a página só deixa de mostrar a seção.
import { build } from 'esbuild'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = path.join(ROOT, 'public', 'data')
const INDEX_PATH = process.env.INDEX_PATH || path.join(DATA_DIR, 'index.json')
const OUTPUT = path.join(DATA_DIR, 'coupon-store-keywords.json')
// palavra que só aparece em 1 produto da loja costuma ser ruído
const MIN_PRODUCTS = 2

// Mesmas regras de palavra da busca no navegador (fonte única).
async function loadKeywordsOf() {
  const result = await build({
    entryPoints: [path.join(ROOT, 'src', 'lib', 'coupons.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    absWorkingDir: ROOT,
    logLevel: 'silent',
  })
  const source = Buffer.from(result.outputFiles[0].text).toString('base64')
  return (await import(`data:text/javascript;base64,${source}`)).keywordsOf
}

async function main() {
  const keywordsOf = await loadKeywordsOf()
  const coupons = JSON.parse(await readFile(path.join(DATA_DIR, 'coupons.json'), 'utf-8'))
  const wanted = new Set(coupons.map((c) => c.merchantSlug).filter(Boolean))
  const index = JSON.parse(await readFile(INDEX_PATH, 'utf-8'))

  const stores = new Map()
  for (const product of index) {
    if (!wanted.has(product.merchantSlug)) continue
    let counts = stores.get(product.merchantSlug)
    if (!counts) stores.set(product.merchantSlug, (counts = new Map()))
    for (const word of new Set(keywordsOf(product.productName || ''))) counts.set(word, (counts.get(word) || 0) + 1)
  }

  const output = {}
  for (const [store, counts] of [...stores].sort(([a], [b]) => a.localeCompare(b))) {
    output[store] = Object.fromEntries([...counts].filter(([, n]) => n >= MIN_PRODUCTS).sort(([a], [b]) => a.localeCompare(b)))
  }
  const json = JSON.stringify(output)
  await writeFile(OUTPUT, json)
  const words = Object.values(output).reduce((n, counts) => n + Object.keys(counts).length, 0)
  console.log(
    `[cupons] palavras do catálogo: ${Object.keys(output).length} de ${wanted.size} lojas com cupom têm produtos; ${words} palavras, ${(json.length / 1024).toFixed(0)} KB.`,
  )
}

main().catch((err) => {
  console.log(`::warning::[cupons] não gerei coupon-store-keywords.json (${err.message}) — a seção "lojas que vendem" fica de fora.`)
})
