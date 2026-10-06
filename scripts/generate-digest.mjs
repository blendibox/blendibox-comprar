// Gera public/data/digest.json — um resumo pequeno (poucos KB, ao contrário do
// index.json que tem dezenas de MB) usado pelo Worker de e-mail semanal
// (worker/newsletter-worker.js, handler `scheduled`) pra montar o "resumo
// semanal de ofertas" via Resend Broadcast API. Roda depois de fetch-feeds e
// fetch-coupons no build.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getSeasonalContext } from './lib/seasonal.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUTPUT_DIR = path.join(ROOT, 'public', 'data')
const SITE_URL = (process.env.SITE_URL || 'https://comprar.blendibox.com.br').replace(/\/$/, '')

// Mesma ordem de prioridade usada nos Destaques da home (src/pages/ListingPage.tsx).
const FEATURED_ORDER = ['vivara', 'centauro', 'nike']
const MAX_ITEMS = 6
const MAX_COUPONS = 3
// Mesmos limites das páginas de campanha (generate-home-highlights.mjs): abaixo
// de 10% não vale destacar, e acima de 80% quase sempre é erro de preço no feed.
const DROP_MIN_PERCENT = 10
const DROP_MAX_PLAUSIBLE_PERCENT = 80
// Quantas das maiores quedas de cada loja entram na rotação semanal.
const DROP_POOL_SIZE = 10

function weekNumber(date) {
  const start = new Date(date.getFullYear(), 0, 1)
  return Math.floor((date - start) / (7 * 24 * 60 * 60 * 1000))
}

// index.json já filtra o placeholder "sem foto" que alguns lojistas mandam
// (ver hasRealImage em fetch-feeds.mjs), mas isso não garante que a URL
// ainda resolve — imagem pode ter sumido do CDN do lojista depois. Como o
// digest só escolhe uns 6 itens no total (não o catálogo inteiro), dá pra
// conferir de verdade em tempo de build em vez de só confiar no campo.
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

// Tenta o candidato "da semana" primeiro; se a imagem não resolver, percorre o
// resto do pool (poucas dezenas de itens, não o catálogo inteiro) até achar um
// com foto de verdade, em vez de forçar um produto sem imagem só pra manter a
// rotação semanal.
async function pickWithReachableImage(pool, week) {
  const maxAttempts = Math.min(pool.length, 20)
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = pool[(week + i) % pool.length]
    if (await hasReachableImage(candidate.awImageUrl)) return candidate
  }
  return null
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
  let dropItems = 0
  for (const slug of prioritySlugs) {
    const candidates = index
      .filter((p) => p.merchantSlug === slug && p.searchPrice != null)
      .sort((a, b) => a.searchPrice - b.searchPrice)
    if (candidates.length === 0) continue

    // Prefere uma queda VERIFICADA da loja (mesma régua das campanhas, do
    // vídeo e do Telegram — ver src/lib/priceDrop.ts): é a única situação em
    // que dá pra afirmar "de R$ X por R$ Y" no e-mail sem inventar desconto.
    // Fica entre as maiores quedas da loja e varia por semana.
    const dropPool = candidates
      .filter(
        (p) =>
          p.priceDropVerified === true &&
          p.previousPrice != null &&
          p.searchPrice < p.previousPrice &&
          p.priceDropPercent >= DROP_MIN_PERCENT &&
          p.priceDropPercent <= DROP_MAX_PLAUSIBLE_PERCENT
      )
      .sort((a, b) => b.priceDropPercent - a.priceDropPercent || a.slug.localeCompare(b.slug))
      .slice(0, DROP_POOL_SIZE)
    let product = await pickWithReachableImage(dropPool, week)
    const isDrop = product != null

    if (!product) {
      // Sem queda verificada: seleção semanal de sempre (sem "de/por"). Varia
      // a escolha a cada semana (em vez de sempre o mesmo produto), mas fica
      // no miolo da faixa de preço (evita cair sempre no mais barato ou mais
      // caro, que tendem a ser pouco representativos da loja).
      const mid = candidates.slice(
        Math.floor(candidates.length * 0.2),
        Math.ceil(candidates.length * 0.8)
      )
      const pool = mid.length > 0 ? mid : candidates
      product = await pickWithReachableImage(pool, week)
      if (!product) {
        console.log(`[digest] "${slug}": nenhum candidato com imagem válida, pulando merchant`)
        continue
      }
    }

    items.push({
      merchantDisplayName: product.merchantDisplayName,
      productName: product.productName,
      price: product.searchPrice,
      currency: product.currency,
      image: product.awImageUrl,
      url: `${SITE_URL}/${product.merchantSlug}/${product.slug}/`,
      // Só nas quedas verificadas — o Worker mostra "De R$ X por R$ Y" quando
      // previousPrice existe (preço habitual monitorado, não preço de tabela).
      ...(isDrop ? { previousPrice: product.previousPrice, dropPercent: product.priceDropPercent } : {}),
    })
    if (isDrop) dropItems++
    if (items.length >= MAX_ITEMS) break
  }

  const activeCoupons = coupons
    .filter((c) => c.isVoucher && c.code)
    .slice(0, MAX_COUPONS)
    .map((c) => ({ advertiser: c.advertiser, code: c.code, title: c.title }))

  // Em época comemorativa (Dia das Mães, Black Friday...) o e-mail ganha o nome
  // da época no assunto e um link pra página de campanha, onde estão as quedas
  // de preço confirmadas. Nem todo produto do resumo é uma queda (loja sem
  // queda verificada cai na seleção semanal de sempre, sem "de/por") — por
  // isso o assunto só situa a época, sem prometer desconto. O Worker usa esses
  // campos e cai no texto padrão se não existirem (worker/newsletter-worker.js,
  // sendWeeklyDigest).
  const season = await getSeasonalContext()
  const seasonal = season
    ? {
        subject: `${season.label}: ofertas da semana no Compare Ofertas`,
        heading: `${season.label}: ofertas da semana`,
        season: { label: season.label, url: season.landingUrl },
      }
    : {}

  await mkdir(OUTPUT_DIR, { recursive: true })
  await writeFile(
    path.join(OUTPUT_DIR, 'digest.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), items, coupons: activeCoupons, ...seasonal })
  )
  console.log(
    `digest.json: ${items.length} produtos (${dropItems} com queda verificada "de/por") e ${activeCoupons.length} cupons gravados.`
  )
  if (season) console.log(`[sazonal] resumo semanal marcado como "${season.label}".`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
