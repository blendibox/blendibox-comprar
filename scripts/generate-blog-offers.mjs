// Gera public/data/blog-offers.json: as listas de ofertas usadas nos blocos
// "offers" dos artigos do blog, a partir do catálogo de hoje. Regras em
// src/lib/blogOffers.ts. Rodar depois de fetch-feeds.
//
// Nunca derruba o build: sem este arquivo o bloco do artigo vira um link pra
// busca do site.
import { build } from 'esbuild'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = path.join(ROOT, 'public', 'data')
// INDEX_PATH, PRODUCTS_DIR e META_PATH servem pra testar com o catálogo do site
const INDEX_PATH = process.env.INDEX_PATH || path.join(DATA_DIR, 'index.json')
const PRODUCTS_DIR = process.env.PRODUCTS_DIR || path.join(DATA_DIR, 'products')
const OUTPUT = path.join(DATA_DIR, 'blog-offers.json')

async function loadRules() {
  const result = await build({
    entryPoints: [path.join(ROOT, 'src', 'lib', 'blogOffers.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    absWorkingDir: ROOT,
    logLevel: 'silent',
  })
  const source = Buffer.from(result.outputFiles[0].text).toString('base64')
  return (await import(`data:text/javascript;base64,${source}`)).OFFER_LISTS
}

const readJson = (file) => readFile(file, 'utf-8').then(JSON.parse)

async function main() {
  const rules = await loadRules()
  const index = await readJson(INDEX_PATH)
  const meta = await readJson(process.env.META_PATH || path.join(DATA_DIR, 'meta.json')).catch(() => null)

  const lists = {}
  for (const [id, rule] of Object.entries(rules)) {
    const offers = []
    for (const entry of index) {
      const details = rule.matchName(entry.productName || '')
      if (!details || !(entry.searchPrice > 0)) continue
      const product = await readJson(path.join(PRODUCTS_DIR, entry.merchantSlug, `${entry.slug}.json`)).catch(() => null)
      offers.push({
        slug: entry.slug,
        merchantSlug: entry.merchantSlug,
        merchantName: entry.merchantDisplayName,
        name: entry.productName,
        price: entry.searchPrice,
        imageUrl: entry.awImageUrl || '',
        ...details,
        kind: rule.kindOf(entry.productName, product?.description || ''),
      })
    }
    // por plataforma (PlayStation primeiro) e, dentro dela, do mais barato ao mais caro
    offers.sort((a, b) => a.platform.localeCompare(b.platform) || a.price - b.price)
    lists[id] = offers
    console.log(`[blog] lista "${id}": ${offers.length} ofertas (${offers.map((o) => `${o.merchantSlug} ${o.kind ?? '?'}`).join(', ')})`)
  }

  await writeFile(OUTPUT, JSON.stringify({ generatedAt: meta?.generatedAt || new Date().toISOString(), lists }))
}

main().catch((err) => {
  console.log(`::warning::[blog] não gerei blog-offers.json (${err.message}) — o bloco de ofertas vira link de busca.`)
})
