// Gera public/data/banners.json — recomendações pra um banner/carrossel
// promocional. Prioriza produtos com venda real recente confirmada
// (public/data/social-proof.json, ver scripts/parse-sales-highlights.mjs) —
// o sinal mais forte que temos, é uma compra de verdade. Se sobrar vaga até
// MAX_ITEMS, completa com a mesma mecânica dos Destaques da home
// (generate-digest.mjs): um produto por merchant prioritário, priorizando
// as marcas com histórico real de conversão (FEATURED_ORDER), no miolo da
// faixa de preço, rotacionando toda semana.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUTPUT_DIR = path.join(ROOT, 'public', 'data')
const PRODUCTS_DIR = path.join(OUTPUT_DIR, 'products')

// Mesma ordem de prioridade usada nos Destaques da home (src/pages/ListingPage.tsx)
// — Vivara, Centauro e Nike são, na prática, as marcas com melhor histórico
// real de conversão entre os merchants prioritários.
const FEATURED_ORDER = ['vivara', 'centauro', 'nike', 'cloviscalcados']
const MAX_ITEMS = 10

function weekNumber(date) {
  const start = new Date(date.getFullYear(), 0, 1)
  return Math.floor((date - start) / (7 * 24 * 60 * 60 * 1000))
}

// Mesmo motivo do generate-digest.mjs: index.json filtra o placeholder de
// "sem foto", mas não garante que a URL ainda resolve (pode ter sumido do
// CDN do lojista). Como só escolhemos até 10 itens, dá pra conferir de
// verdade em vez de só confiar no campo.
async function hasReachableImage(url) {
  if (!url) return false
  try {
    const res = await fetch(url, { method: 'HEAD' })
    if (!res.ok) return false
    const contentType = res.headers.get('content-type') || ''
    return contentType.startsWith('image/')
  } catch {
    return false
  }
}

// A URL de afiliado (awDeepLink) só existe no JSON completo do produto, não
// no índice leve — lê só pros poucos itens finalmente escolhidos.
async function loadDeepLink(merchantSlug, slug) {
  try {
    const full = JSON.parse(await readFile(path.join(PRODUCTS_DIR, merchantSlug, `${slug}.json`), 'utf-8'))
    return full.awDeepLink || full.merchantDeepLink || null
  } catch {
    return null
  }
}

async function buildItem(product, label) {
  if (!(await hasReachableImage(product.awImageUrl))) return null
  const url = await loadDeepLink(product.merchantSlug, product.slug)
  if (!url) return null

  const hasDiscount = product.storePrice != null && product.storePrice > product.searchPrice
  return {
    productName: product.productName,
    merchant: product.merchantDisplayName,
    image: product.awImageUrl,
    price: product.searchPrice,
    oldPrice: hasDiscount ? product.storePrice : null,
    currency: product.currency,
    rating: product.rating ?? null,
    label,
    url,
  }
}

async function main() {
  const index = JSON.parse(await readFile(path.join(OUTPUT_DIR, 'index.json'), 'utf-8'))
  const merchants = JSON.parse(await readFile(path.join(OUTPUT_DIR, 'merchants.json'), 'utf-8'))
  let socialProof = []
  try {
    socialProof = JSON.parse(await readFile(path.join(OUTPUT_DIR, 'social-proof.json'), 'utf-8'))
  } catch {
    socialProof = []
  }

  const byKey = new Map(index.map((p) => [`${p.merchantSlug}:${p.slug}`, p]))
  const items = []
  const seenSlugs = new Set()
  let fromRealSales = 0

  // Passo 1: vendas reais confirmadas primeiro (já vêm ordenadas da mais
  // recente pra mais antiga em social-proof.json) — sinal mais forte que
  // temos de que o produto realmente vende.
  for (const sale of socialProof) {
    if (items.length >= MAX_ITEMS) break
    const key = `${sale.merchantSlug}:${sale.slug}`
    if (seenSlugs.has(key)) continue
    const product = byKey.get(key)
    if (!product || product.searchPrice == null) continue

    const item = await buildItem(product, `comprado ${sale.label}`)
    if (!item) continue
    items.push(item)
    seenSlugs.add(key)
    fromRealSales++
  }

  // Passo 2: se sobrar vaga, completa com a mesma rotação semanal dos
  // Destaques, priorizando marcas de conversão comprovada (FEATURED_ORDER).
  if (items.length < MAX_ITEMS) {
    const prioritySlugs = merchants
      .filter((m) => m.priority)
      .map((m) => m.slug)
      .sort((a, b) => {
        const ia = FEATURED_ORDER.indexOf(a)
        const ib = FEATURED_ORDER.indexOf(b)
        if (ia === -1 && ib === -1) return 0
        if (ia === -1) return 1
        if (ib === -1) return -1
        return ia - ib
      })

    const week = weekNumber(new Date())
    for (const slug of prioritySlugs) {
      if (items.length >= MAX_ITEMS) break

      const candidates = index
        .filter((p) => p.merchantSlug === slug && p.searchPrice != null && !seenSlugs.has(`${slug}:${p.slug}`))
        .sort((a, b) => a.searchPrice - b.searchPrice)
      if (candidates.length === 0) continue

      // Varia a escolha a cada semana, mas fica no miolo da faixa de preço
      // (evita cair sempre no mais barato ou mais caro).
      const mid = candidates.slice(Math.floor(candidates.length * 0.2), Math.ceil(candidates.length * 0.8))
      const pool = mid.length > 0 ? mid : candidates

      const maxAttempts = Math.min(pool.length, 20)
      let item = null
      for (let i = 0; i < maxAttempts; i++) {
        const candidate = pool[(week + i) % pool.length]
        item = await buildItem(candidate, 'destaque da semana')
        if (item) {
          seenSlugs.add(`${slug}:${candidate.slug}`)
          break
        }
      }
      if (!item) {
        console.log(`[banners] "${slug}": nenhum candidato válido em ${maxAttempts} tentativas, pulando merchant`)
        continue
      }
      items.push(item)
    }
  }

  await mkdir(OUTPUT_DIR, { recursive: true })
  await writeFile(path.join(OUTPUT_DIR, 'banners.json'), JSON.stringify(items))
  console.log(`banners.json: ${items.length} produtos gravados (${fromRealSales} de venda real recente confirmada).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
