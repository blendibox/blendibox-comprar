// Gera public/data/digest.json — um resumo pequeno (poucos KB, ao contrário do
// index.json que tem dezenas de MB) usado pelo Worker de e-mail semanal
// (worker/newsletter-worker.js, handler `scheduled`) pra montar o "resumo
// semanal de ofertas" via Resend Broadcast API. Roda depois de fetch-feeds e
// parse-coupons no build.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUTPUT_DIR = path.join(ROOT, 'public', 'data')
const SITE_URL = (process.env.SITE_URL || 'https://comprar.blendibox.com.br').replace(/\/$/, '')

// Mesma ordem de prioridade usada nos Destaques da home (src/pages/ListingPage.tsx).
const FEATURED_ORDER = ['vivara', 'centauro', 'nike']
const MAX_ITEMS = 6
const MAX_COUPONS = 3

function weekNumber(date) {
  const start = new Date(date.getFullYear(), 0, 1)
  return Math.floor((date - start) / (7 * 24 * 60 * 60 * 1000))
}

async function main() {
  const index = JSON.parse(await readFile(path.join(OUTPUT_DIR, 'index.json'), 'utf-8'))
  const merchants = JSON.parse(await readFile(path.join(OUTPUT_DIR, 'merchants.json'), 'utf-8'))
  let coupons = []
  try {
    coupons = JSON.parse(await readFile(path.join(OUTPUT_DIR, 'coupons.json'), 'utf-8'))
  } catch {
    coupons = []
  }

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
  const items = []
  for (const slug of prioritySlugs) {
    const candidates = index
      .filter((p) => p.merchantSlug === slug && p.searchPrice != null)
      .sort((a, b) => a.searchPrice - b.searchPrice)
    if (candidates.length === 0) continue
    // Varia a escolha a cada semana (em vez de sempre o mesmo produto), mas
    // fica no miolo da faixa de preço (evita cair sempre no mais barato ou
    // mais caro, que tendem a ser pouco representativos da loja).
    const mid = candidates.slice(
      Math.floor(candidates.length * 0.2),
      Math.ceil(candidates.length * 0.8)
    )
    const pool = mid.length > 0 ? mid : candidates
    const product = pool[week % pool.length]
    items.push({
      merchantDisplayName: product.merchantDisplayName,
      productName: product.productName,
      price: product.searchPrice,
      currency: product.currency,
      image: product.awImageUrl,
      url: `${SITE_URL}/${product.merchantSlug}/${product.slug}/`,
    })
    if (items.length >= MAX_ITEMS) break
  }

  const activeCoupons = coupons
    .filter((c) => c.isVoucher && c.code)
    .slice(0, MAX_COUPONS)
    .map((c) => ({ advertiser: c.advertiser, code: c.code, title: c.title }))

  await mkdir(OUTPUT_DIR, { recursive: true })
  await writeFile(
    path.join(OUTPUT_DIR, 'digest.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), items, coupons: activeCoupons })
  )
  console.log(`digest.json: ${items.length} produtos e ${activeCoupons.length} cupons gravados.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
